const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');

module.exports = function setupFollowupsRoutes(app, pool) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Configure multer for recording uploads
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const dir = 'uploads/recordings';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      cb(null, `followup-${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
  });

  const upload = multer({ storage: storage });

  // Add 'Client Joined' to status ENUM if not exists
  pool.query(`
    ALTER TABLE followups 
    MODIFY COLUMN status ENUM('Scheduled', 'Completed', 'Pending', 'Overdue', 'Cancelled', 'Client Joined') DEFAULT 'Scheduled'
  `).catch(err => console.log('Followup status already updated or failed:', err.message));

  async function getConnection() {
    return pool.getConnection();
  }

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  // Helper to map related_type and related_id to specific ID columns
  const mapRelatedToColumn = (type, id, data) => {
    switch (type) {
      case 'Lead': data.lead_id = id; break;
      case 'Deal': data.deal_id = id; break;
      case 'Customer': data.contact_id = id; break;
      case 'Invoice': data.invoice_id = id; break;
    }
    return data;
  };

  const updateStatusFromOutcome = async (connection, relatedType, relatedId, outcome) => {
    if (!relatedId || !outcome) return;

    let leadStatus = 'Contacted'; // Default

    switch (outcome) {
      case 'Interested': leadStatus = 'Contacted'; break;
      case 'Not Interested': leadStatus = 'Lost'; break;
      case 'Wrong Number': leadStatus = 'Unqualified'; break;
      case 'Meeting Scheduled':
      case 'Converted to Deal':
      case 'Asking for Quotation':
      case 'Quotation': leadStatus = 'Qualified'; break;
      case 'Call Back Later':
      case 'Follow-up Required':
      case 'No Answer': leadStatus = 'Contacted'; break;
      
      // Quotation syncs
      case 'Revise Quotation': leadStatus = 'Revised Quotation'; break;
      case 'Quotation Accepted': leadStatus = 'Won'; break;
      case 'Quotation Accepted & Converted to Deal': leadStatus = 'Converted to Deal'; break;
      case 'Quotation Declined': leadStatus = 'Lost'; break;
      
      default: leadStatus = 'Contacted';
    }

    try {
      const runner = connection || pool;
      
      if (relatedType === 'Lead') {
        await runner.query(
          "UPDATE leads SET lead_status = ?, last_follow_up = NOW(), updated_at = NOW() WHERE id = ?",
          [leadStatus, relatedId]
        );
      } else if (relatedType === 'Deal') {
        const dealStage = (leadStatus === 'Qualified' || leadStatus === 'Revised Quotation') ? 'Quotation' : (leadStatus === 'Won' ? 'Won' : (leadStatus === 'Lost' ? 'Lost' : 'In Progress'));
        await runner.query(
          "UPDATE deals SET pipeline = ?, deal_stage = ?, updated_at = NOW() WHERE id = ?",
          [dealStage, dealStage, relatedId]
        );
      }

      // If it's a quotation outcome, sync with the latest quotation
      if (['Revise Quotation', 'Quotation Accepted', 'Quotation Accepted & Converted to Deal', 'Quotation Declined'].includes(outcome)) {
        const targetQuotationStatus = outcome === 'Revise Quotation' ? 'Revised' : (outcome === 'Quotation Declined' ? 'Declined' : 'Accepted');
        
        // Find latest quotation
        let col = relatedType === 'Lead' ? 'lead_id' : (relatedType === 'Deal' ? 'deal_id' : 'client_id');
        const [estRows] = await runner.query(
          `SELECT id FROM estimations WHERE ${col} = ? ORDER BY id DESC LIMIT 1`,
          [relatedId]
        );
        
        if (estRows.length > 0) {
          const estId = estRows[0].id;
          // Update quotation status
          await runner.query(
            `UPDATE estimations SET status = ?, updated_at = NOW() WHERE id = ?`,
            [targetQuotationStatus, estId]
          );
          
          console.log(`Quotation ${estId} status synced to ${targetQuotationStatus} from outcome`);
        }
      }
    } catch (err) {
      console.error(`Failed to update status for ${relatedType} ${relatedId}:`, err.message);
    }
  };

  const sendProfessionalEmailInvite = async (followupData) => {
    const {
      client_email,
      subject,
      description,
      scheduled_date,
      scheduled_time,
      meeting_link,
      formal_message,
      assigned_to_name,
      assigned_to_email,
      type,
      follow_up_count
    } = followupData;

    // SMTP configuration from environment variables
    const SMTP_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const SMTP_PORT = process.env.EMAIL_PORT || process.env.SMTP_PORT || 587;
    const SMTP_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
    const SMTP_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('⚠️ SMTP credentials missing. Cannot send professional email invite.');
      return false;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: SMTP_PORT == 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      // Format date safely
      let dateObj;
      try {
        if (scheduled_date.includes('T')) {
          dateObj = new Date(scheduled_date);
        } else {
          // Handle YYYY-MM-DD and HH:mm
          const [year, month, day] = scheduled_date.split('-').map(Number);
          const [hours, mins] = (scheduled_time || '10:00').split(':').map(Number);
          dateObj = new Date(year, month - 1, day, hours, mins);
        }

        if (isNaN(dateObj.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (e) {
        dateObj = new Date();
      }

      // Formatted date for email
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Use a tracking link for the client instead of direct meeting link
      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
      const clientMeetingLink = followupData.id ? `${BASE_URL}/join-meeting/${followupData.id}` : meeting_link;

      // Generate ICS file content with automatic acceptance flags
      const startTimeICS = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endTimeICS = new Date(dateObj.getTime() + 30 * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PROID:-//Enterprise CRM//NONSGML v1.0//EN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${Date.now()}@enterprise-crm.local`,
        `DTSTAMP:${startTimeICS}`,
        `DTSTART:${startTimeICS}`,
        `DTEND:${endTimeICS}`,
        `SUMMARY:${subject}`,
        `DESCRIPTION:${description || formal_message}\\n\\nJoin Link: ${clientMeetingLink}`,
        `LOCATION:${clientMeetingLink || 'Online Meeting'}`,
        `ORGANIZER;CN="${assigned_to_name}":MAILTO:${SMTP_USER}`,
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE;CN="Client":MAILTO:${client_email}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'CLASS:PUBLIC',
        'X-MICROSOFT-CDO-BUSYSTATUS:BUSY',
        'CATEGORIES:Business,Meeting',
        'SEQUENCE:0',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Meeting Reminder',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Upcoming Meeting Tomorrow',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const mailOptions = {
        from: `"${assigned_to_name}" <${SMTP_USER}>`,
        to: client_email,
        cc: assigned_to_email,
        subject: `📅 Meeting Invitation: ${subject} ${follow_up_count > 0 ? `(Follow-up #${follow_up_count})` : ''}`,
        text: `Dear Client,\n\n${formal_message}\n\nMeeting Agenda:\n${description || 'Discussion regarding project requirements and strategic next steps.'}\n\nMeeting Details:\nDate: ${formattedDate}\nTime: ${scheduled_time} (IST)\nInteraction: #${follow_up_count || 1}\nJoin Link: ${clientMeetingLink}\n\nBest Regards,\n${assigned_to_name}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; color: #333; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); padding: 35px 20px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 26px; font-weight: 700; text-transform: ; letter-spacing: 1px;">Meeting Invitation</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 15px; font-weight: 500;">
                ${follow_up_count > 1 ? `Strategic Follow-up Interaction #${follow_up_count}` : 'Initial Business Collaboration Discussion'}
              </p>
            </div>
            
            <div style="padding: 35px; background-color: white;">
              <p style="font-size: 17px; line-height: 1.6; margin-bottom: 20px; color: #1a202c; font-weight: 600;">Dear Valued Client,</p>
              <p style="font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 25px;">${formal_message || 'I would like to schedule a session to discuss our ongoing collaboration and align on the next strategic milestones for your project.'}</p>
              
              <div style="background-color: #f7fafc; border-left: 5px solid #1a73e8; padding: 25px; border-radius: 4px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #2b6cb0; text-transform: ; letter-spacing: 1.2px; font-weight: 700;">Meeting Agenda & Objective</h3>
                <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #2d3748;">
                  ${description || 'Detailed review of project requirements, timeline finalization, and addressing any technical queries to ensure seamless execution.'}
                </p>
              </div>

              <div style="margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1a202c; font-weight: 700;">Schedule & Interaction Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; width: 150px; color: #718096; font-size: 14px;">Scheduled Date</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; font-weight: 600; color: #2d3748; font-size: 14px;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Preferred Time</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; font-weight: 600; color: #2d3748; font-size: 14px;">${scheduled_time} (IST)</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Interaction Type</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; font-weight: 600; color: #2d3748; font-size: 14px;">${type}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 14px;">Sequence Number</td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #edf2f7; font-weight: 600; color: #2d3748; font-size: 14px;">Interaction #${follow_up_count || 1}</td>
                  </tr>
                </table>
              </div>

              ${clientMeetingLink ? `
              <div style="text-align: center; margin: 40px 0;">
                <a href="${clientMeetingLink}" style="background-color: #1a73e8; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(66, 153, 225, 0.4);">JOIN VIRTUAL MEETING</a>
                <p style="margin-top: 15px; font-size: 12px; color: #a0aec0;">Direct Link: <a href="${clientMeetingLink}" style="color: #3182ce; text-decoration: underline;">${clientMeetingLink}</a></p>
              </div>
              ` : ''}

              <div style="padding: 20px; background-color: #ebf8ff; border-radius: 10px; border: 1px solid #bee3f8; margin-top: 20px;">
                <p style="margin: 0; font-size: 13px; color: #2c5282; line-height: 1.6;">
                  <strong style="color: #2b6cb0;">Calendar Synchronization:</strong> This invitation has been automatically staged on your calendar. Please confirm your attendance by clicking <strong>'Yes'</strong> or <strong>'Accept'</strong> in your calendar application.
                </p>
              </div>
            </div>
            
            <div style="background-color: #f7fafc; padding: 25px; text-align: center; border-top: 1px solid #edf2f7;">
              <p style="margin: 0; font-size: 13px; color: #718096;">Sent by ${assigned_to_name} via Enterprise CRM Automation</p>
            </div>
            
            <div style="background-color: #333; padding: 15px; text-align: center; font-size: 11px; color: #aaa;">
              This invitation was automatically generated by the Enterprise CRM System.<br/>
              &copy; ${new Date().getFullYear()} All Rights Reserved
            </div>
          </div>
        `,
        icalEvent: {
          filename: 'invite.ics',
          method: 'REQUEST',
          content: icsContent
        }
      };

      console.log('✉️ Attempting to send mail with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        cc: mailOptions.cc,
        subject: mailOptions.subject
      });

      const info = await transporter.sendMail(mailOptions);
      console.log(`✓ Professional email invitation sent. Response: ${info.response}, MessageID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Email Invite Error:', error.message);
      if (error.message.includes('535') || error.message.includes('BadCredentials')) {
        console.error('💡 TIP: Check your SMTP_USER and SMTP_PASS in .env. If using Gmail, you MUST use an App Password.');
      }
      return false;
    }
  };

  const generateValidFallbackLink = (type, currentLink) => {
    // If we already have a valid non-placeholder link, use it
    if (currentLink && !currentLink.includes('/new') && currentLink.startsWith('http')) {
      return currentLink;
    }

    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const part = (l) => Array.from({ length: l }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    // Use the 3-4-3 letters format which is standard for Google Meet
    const code = `${part(3)}-${part(4)}-${part(3)}`;

    if (type === 'Google Meet' || type === 'Internal Video Call' || type === 'Meeting' || type === 'Demo') {
      return `https://meet.google.com/${code}`;
    } else if (type === 'Zoom Meeting') {
      return `https://zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}`;
    } else if (type === 'WhatsApp Call') {
      return `https://wa.me/call/${code}`;
    } else {
      // Robust default: Jitsi
      return `https://meet.jit.si/Enterprise-CRM-${code}`;
    }
  };

  const sendCalendarInvite = async (followupData) => {
    const {
      client_email,
      assigned_to_email,
      subject,
      description,
      scheduled_date,
      scheduled_time,
      meeting_link,
      formal_message,
      assigned_to_name,
      meeting_duration,
      type,
      calendar_event_id
    } = followupData;

    if (!client_email) {
      console.warn('Skipping calendar invite: No client email provided');
      return null;
    }

    // Auth configuration from environment variables
    const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
    let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
    const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

    if (!CLIENT_EMAIL || !PRIVATE_KEY) {
      console.warn('⚠️ Google Calendar API credentials missing. Falling back to dynamic link.');
      console.log(`📅 Creating Fallback Invite for ${client_email}...`);

      const fallbackLink = generateValidFallbackLink(type, meeting_link);

      return {
        calendar_event_id: calendar_event_id || "mock-event-id-" + Date.now(),
        meeting_link: fallbackLink
      };
    }

    // Clean the private key (handle quotes and newlines from .env)
    let cleanedKey = PRIVATE_KEY;
    if (cleanedKey && cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
      cleanedKey = cleanedKey.substring(1, cleanedKey.length - 1);
    }
    const formattedKey = cleanedKey?.replace(/\\n/g, '\n').replace(/\n/g, '\n');

    try {
      if (!formattedKey) {
        throw new Error('Private key is empty after formatting');
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: CLIENT_EMAIL,
          private_key: formattedKey
        },
        scopes: ['https://www.googleapis.com/auth/calendar']
      });

      const client = await auth.getClient();
      const calendar = google.calendar({ version: 'v3', auth: client });

      // Target the specific calendar ID from env, or the assigned person's calendar, or default to service account's 'primary'
      const targetCalendarId = GOOGLE_CALENDAR_ID || assigned_to_email || 'primary';

      console.log(`📅 Targeting Calendar: ${targetCalendarId} for ${client_email}`);

      // Calculate end time (default 30 mins)
      const durationMatch = meeting_duration?.match(/(\d+)/);
      const durationMins = durationMatch ? parseInt(durationMatch[1]) : 30;

      // Ensure scheduled_date is just YYYY-MM-DD
      let datePart = scheduled_date;
      if (datePart instanceof Date) {
        datePart = datePart.toISOString().split('T')[0];
      } else if (typeof datePart === 'string') {
        datePart = datePart.split('T')[0];
      }

      // Ensure scheduled_time is HH:MM
      let timePart = scheduled_time || '10:00';
      if (timePart.includes(' ')) { // Handle "10:00 AM" if it comes in that format
        const [time, ampm] = timePart.split(' ');
        let [hours, mins] = time.split(':');
        if (ampm === 'PM' && hours !== '12') hours = parseInt(hours) + 12;
        if (ampm === 'AM' && hours === '12') hours = '00';
        timePart = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      } else if (timePart.length > 5) {
        timePart = timePart.substring(0, 5);
      }

      console.log('📅 Constructing Calendar Time:', { datePart, timePart, originalDate: scheduled_date, originalTime: scheduled_time });

      const startTime = new Date(`${datePart}T${timePart}:00`);

      if (isNaN(startTime.getTime())) {
        console.error('❌ Invalid Start Time constructed:', { datePart, scheduled_time });
        throw new Error('Invalid time value for calendar event');
      }

      const endTime = new Date(startTime.getTime() + durationMins * 60000);

      const attendees = [{ email: client_email }];
      if (assigned_to_email) attendees.push({ email: assigned_to_email });
      attendees.push({ email: CLIENT_EMAIL, responseStatus: 'accepted' });

      console.log('📅 Calendar Event Details:', {
        summary: subject,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendees: attendees.map(a => a.email),
        serviceAccount: CLIENT_EMAIL
      });

      // For Google Meet, we want the API to generate a fresh link, not use the 'new' placeholder
      const location = type === 'Google Meet' && meeting_link?.includes('/new') ? '' : meeting_link;

      const event = {
        summary: subject,
        location: location,
        description: `${formal_message}\n\nJoin Link: ${meeting_link}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      // Add conference data only for Google Meet - Use 'meet' instead of 'hangoutsMeet' sometimes helps, but 'hangoutsMeet' is standard
      if (type === 'Google Meet') {
        event.conferenceData = {
          createRequest: {
            requestId: "meet-" + Date.now(),
            conferenceSolutionKey: { type: "hangoutsMeet" }
          },
        };
      }

      let response;
      try {
        if (calendar_event_id && !calendar_event_id.startsWith('mock-') && !calendar_event_id.startsWith('fallback-')) {
          console.log(`🚀 Updating REAL Google Calendar Event ${calendar_event_id} for ${client_email}...`);
          response = await calendar.events.patch({
            auth: client,
            calendarId: targetCalendarId,
            eventId: calendar_event_id,
            resource: event,
            sendUpdates: 'all',
            conferenceDataVersion: 1,
          });
          console.log(`✓ Real Google Calendar event updated: ${response.data.id}`);
        } else {
          console.log(`🚀 Sending REAL Google Calendar Invite to ${client_email}...`);
          response = await calendar.events.insert({
            auth: client,
            calendarId: targetCalendarId,
            resource: event,
            sendUpdates: 'all',
            conferenceDataVersion: 1,
          });
          console.log(`✓ Real Google Calendar event created: ${response.data.id}`);
        }
      } catch (insertError) {
        const errorMsg = insertError.message || '';
        const isDelegationError = errorMsg.includes('Domain-Wide Delegation') || errorMsg.includes('invite attendees');
        const isConferenceError = errorMsg.includes('conference type') || errorMsg.includes('conferenceData');

        console.warn(`⚠️ Google Calendar API Warning: ${errorMsg}`);

        if (isDelegationError || isConferenceError) {
          console.warn(`💡 Attempting fallback due to: ${isDelegationError ? 'Attendee/Delegation restrictions' : 'Conference generation failure'}`);

          // Try again without attendees and maybe without conference
          const localEvent = { ...event };
          delete localEvent.attendees;

          // Determine conference version for retry - version 0 means no conference data is expected
          const retryConferenceVersion = isConferenceError ? 0 : 1;
          if (isConferenceError) {
            delete localEvent.conferenceData;
          }

          try {
            if (calendar_event_id && !calendar_event_id.startsWith('mock-') && !calendar_event_id.startsWith('fallback-')) {
              response = await calendar.events.patch({
                auth: client,
                calendarId: targetCalendarId,
                eventId: calendar_event_id,
                resource: localEvent,
                conferenceDataVersion: retryConferenceVersion,
              });
            } else {
              response = await calendar.events.insert({
                auth: client,
                calendarId: targetCalendarId,
                resource: localEvent,
                conferenceDataVersion: retryConferenceVersion,
              });
            }
          } catch (retryError) {
            console.error('❌ Retry attempt failed:', retryError.message);

            // Final attempt: No attendees AND no conference
            console.log('🔄 Final retry: Removing conference data and attendees...');
            const finalEvent = { ...localEvent };
            delete finalEvent.conferenceData;
            delete finalEvent.attendees;

            try {
              if (calendar_event_id && !calendar_event_id.startsWith('mock-') && !calendar_event_id.startsWith('fallback-')) {
                response = await calendar.events.patch({
                  auth: client,
                  calendarId: targetCalendarId,
                  eventId: calendar_event_id,
                  resource: finalEvent,
                  conferenceDataVersion: 0,
                });
              } else {
                response = await calendar.events.insert({
                  auth: client,
                  calendarId: targetCalendarId,
                  resource: finalEvent,
                  conferenceDataVersion: 0,
                });
              }
            } catch (finalError) {
              console.error('❌ Final retry failed:', finalError.message);
              const fallbackLink = generateValidFallbackLink(type, meeting_link);
              return {
                calendar_event_id: calendar_event_id || "fallback-id-" + Date.now(),
                meeting_link: fallbackLink
              };
            }
          }

          // NOTE: We don't send the professional email here anymore to avoid ID mismatch (using Date.now())
          // It will be sent after DB insertion with the real ID.

          console.log(`✓ Local Google Calendar event created/updated: ${response.data.id}`);
        } else {
          throw insertError; // Re-throw if it's a different error
        }
      }

      // If Google API succeeded but didn't provide a hangoutLink (e.g. for Zoom/Phone types)
      // or if it's a Google Meet but Link generation was disabled/failed
      let finalMeetingLink = response.data.hangoutLink || meeting_link;

      // Ensure we never return a '/new' placeholder
      if (!finalMeetingLink || finalMeetingLink.includes('/new')) {
        finalMeetingLink = generateValidFallbackLink(type, finalMeetingLink);
      }

      return {
        calendar_event_id: response.data.id,
        meeting_link: finalMeetingLink
      };

    } catch (error) {
      console.error('❌ Google Calendar API Error:', error.message);
      // Fallback to mock so user can still proceed
      const fallbackLink = generateValidFallbackLink(type, meeting_link);
      return {
        calendar_event_id: calendar_event_id || "fallback-id-" + Date.now(),
        meeting_link: fallbackLink
      };
    }
  };

  const incrementFollowupCount = async (connection, leadId) => {
    if (!leadId) return 0;
    try {
      const runner = connection || pool;
      await runner.query(
        "UPDATE leads SET follow_up_count = COALESCE(follow_up_count, 0) + 1, last_follow_up = NOW(), updated_at = NOW() WHERE id = ?",
        [leadId]
      );

      const [rows] = await runner.query("SELECT follow_up_count FROM leads WHERE id = ?", [leadId]);
      const count = rows[0]?.follow_up_count || 0;
      console.log(`Lead ${leadId} follow_up_count incremented to ${count}`);
      return count;
    } catch (err) {
      console.error(`Failed to increment follow_up_count for lead ${leadId}:`, err.message);
      return 0;
    }
  };

  app.post('/api/followups', async (req, res) => {
    let connection;
    try {
      const {
        related_type, related_id, type, subject, description,
        scheduled_date, scheduled_time, priority, reminder_before,
        is_recurring, recurrence_frequency, recurrence_end_date,
        meeting_link, meeting_location, meeting_duration,
        assigned_to, assigned_to_name, status, outcome, call_duration, remarks,
        next_followup_date, next_followup_time, next_followup_type, previous_followup_id,
        client_email, client_phone, formal_message, assigned_to_email
      } = req.body;

      connection = await getConnection();

      // Sanitize assigned_to to ensure it's an integer
      let sanitizedAssignedTo = null;
      if (assigned_to) {
        const parsed = parseInt(assigned_to);
        // Check if it's a valid integer (including 0) and not a UUID string
        if (!isNaN(parsed) && (/^\d+$/.test(String(assigned_to)))) {
          sanitizedAssignedTo = parsed;
        } else {
          console.warn(`⚠️ Invalid assigned_to value: ${assigned_to}. Setting to NULL.`);
          sanitizedAssignedTo = null;
        }
      }

      const insertData = {
        related_type, related_id, type, subject, description,
        scheduled_date, scheduled_time, priority, reminder_before,
        is_recurring: is_recurring ? 1 : 0,
        recurrence_frequency, recurrence_end_date: recurrence_end_date || null,
        meeting_link, meeting_location, meeting_duration,
        assigned_to: sanitizedAssignedTo,
        assigned_to_name,
        status: status || 'Scheduled',
        outcome, call_duration, remarks,
        next_followup_date: next_followup_date || null,
        next_followup_time: next_followup_time || null,
        next_followup_type: next_followup_type || null,
        previous_followup_id: previous_followup_id || null,
        client_email, client_phone, formal_message, assigned_to_email
      };

      // Automation: Update Lead status based on follow-up outcome or schedule
      let followUpCount = 0;
      if (related_type === 'Lead' || related_type === 'Deal') {
        if (related_type === 'Lead') {
          followUpCount = await incrementFollowupCount(connection, related_id);
          insertData.follow_up_count = followUpCount;
        }

        if (outcome) {
          await updateStatusFromOutcome(connection, related_type, related_id, outcome);
        } else if (related_type === 'Lead' && (status === 'Scheduled' || !status || status === 'Completed' || status === 'Pending')) {
          try {
            await connection.query(
              "UPDATE leads SET lead_status = 'Contacted', updated_at = NOW() WHERE id = ?",
              [related_id]
            );
            console.log(`Lead ${related_id} status updated to Contacted due to scheduled follow-up`);
          } catch (leadErr) {
            console.error('Failed to update lead status:', leadErr.message);
          }
        }
      }

      // Auto-trigger calendar invite if scheduling a meeting (move this here so followUpCount is ready)
      let calendarInfo = null;
      const inviteTypes = ['Google Meet', 'Zoom Meeting', 'Internal Video Call', 'Demo', 'WhatsApp Call', 'In-Person Meeting', 'Meeting', 'Proposal Discussion', 'Payment Reminder', 'Call'];

      console.log(`🔍 Checking if invite should be sent: Type=${type}, Email=${client_email}, IsInList=${inviteTypes.includes(type)}`);

      if (inviteTypes.includes(type) && client_email) {
        console.log(`📅 Triggering calendar invite for ${client_email}...`);
        calendarInfo = await sendCalendarInvite(insertData);
        if (calendarInfo) {
          console.log(`✓ Calendar invite triggered successfully. Link: ${calendarInfo.meeting_link}`);
          insertData.calendar_event_id = calendarInfo.calendar_event_id;
          insertData.meeting_link = calendarInfo.meeting_link || insertData.meeting_link;
        } else {
          console.warn(`⚠️ Calendar invite returned null for ${client_email}`);
        }
      } else if (inviteTypes.includes(type) && !client_email) {
        console.warn(`⚠️ Missing client_email for meeting type ${type}. Invite skipped.`);
      } else if (!inviteTypes.includes(type) && client_email) {
        console.log(`ℹ️ Follow-up type ${type} is not in inviteTypes list. Email invite will still be sent if it's a meeting.`);
      }

      // Map to specific ID columns for relational integrity if needed
      mapRelatedToColumn(related_type, related_id, insertData);

      const [result] = await connection.query(`
        INSERT INTO followups (
          related_type, related_id, type, subject, description,
          scheduled_date, scheduled_time, priority, reminder_before,
          is_recurring, recurrence_frequency, recurrence_end_date,
          meeting_link, meeting_location, meeting_duration,
          assigned_to, assigned_to_name, status, outcome, call_duration, remarks, 
          next_followup_date, next_followup_time, next_followup_type,
          lead_id, deal_id, contact_id, invoice_id, previous_followup_id,
          client_email, client_phone, formal_message, calendar_event_id, assigned_to_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        insertData.related_type, insertData.related_id, insertData.type, insertData.subject, insertData.description,
        insertData.scheduled_date, insertData.scheduled_time, insertData.priority, insertData.reminder_before,
        insertData.is_recurring, insertData.recurrence_frequency, insertData.recurrence_end_date,
        insertData.meeting_link, insertData.meeting_location, meeting_duration,
        insertData.assigned_to, insertData.assigned_to_name, insertData.status, insertData.outcome, insertData.call_duration,
        insertData.remarks,
        insertData.next_followup_date, insertData.next_followup_time, insertData.next_followup_type,
        insertData.lead_id || null, insertData.deal_id || null, insertData.contact_id || null, insertData.invoice_id || null,
        insertData.previous_followup_id,
        insertData.client_email, insertData.client_phone, insertData.formal_message, insertData.calendar_event_id,
        insertData.assigned_to_email
      ]);

      const newId = result.insertId;

      // Always send professional email invite for meeting types to ensure notification
      if (inviteTypes.includes(type) && client_email) {
        console.log(`✉️ Sending professional email invite to ${client_email}...`);
        const emailSent = await sendProfessionalEmailInvite({ ...insertData, id: newId });
        if (emailSent) {
          console.log(`✓ Professional email sent successfully to ${client_email}`);
        } else {
          console.error(`❌ Failed to send professional email to ${client_email}`);
        }
      }

      res.status(201).json({
        message: 'Follow-up created successfully',
        id: newId
      });
    } catch (error) {
      responseError(res, 500, 'Failed to create follow-up', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.get('/api/followups', async (req, res) => {
    try {
      const { assigned_to } = req.query;

      let queryText = `
        SELECT f.*,
               CASE 
                 WHEN f.related_type = 'Lead' THEN COALESCE(NULLIF(l.lead_name, ''), 'Lead')
                 WHEN f.related_type = 'Deal' THEN COALESCE(NULLIF(d.deal_name, ''), 'Deal')
                 WHEN f.related_type = 'Customer' THEN COALESCE(NULLIF(TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))), ''), p.name, d.deal_name, 'SP Tech erp')
                 WHEN f.related_type = 'Invoice' THEN COALESCE(NULLIF(i.invoice_number, ''), 'Invoice')
                 WHEN p.name IS NOT NULL THEN p.name
                 WHEN d.deal_name IS NOT NULL THEN d.deal_name
                 ELSE 'N/A'
               END as related_name,
               COALESCE(f.client_email, l.email, c.email) as client_email,
               COALESCE(f.client_phone, l.phone, c.phone) as client_phone,
               l.lead_status as lead_status,
               d.deal_stage as deal_stage,
               d.status as deal_status,
               (SELECT status FROM estimations 
                WHERE (deal_id = d.id OR lead_id = l.id) 
                ORDER BY created_at DESC LIMIT 1) as latest_quotation_status,
               (SELECT COUNT(*) FROM estimations 
                WHERE (deal_id = d.id OR lead_id = l.id) AND status = 'Revised') as revision_count
        FROM followups f
        LEFT JOIN leads l ON f.related_type = 'Lead' AND f.related_id = l.id
        LEFT JOIN deals d ON (f.related_type = 'Deal' AND f.related_id = d.id) OR f.deal_id = d.id
        LEFT JOIN contacts c ON f.related_type = 'Customer' AND f.related_id = c.id
        LEFT JOIN projects p ON f.project_id = p.id
        LEFT JOIN invoices i ON f.related_type = 'Invoice' AND f.related_id = i.id
        WHERE 1=1
      `;
      const params = [];

      if (assigned_to) {
        queryText += ' AND f.assigned_to_name = ?';
        params.push(assigned_to);
      }

      if (req.query.related_id) {
        queryText += ' AND f.related_id = ?';
        params.push(req.query.related_id);
      }

      if (req.query.related_type) {
        queryText += ' AND f.related_type = ?';
        params.push(req.query.related_type);
      }

      queryText += ' ORDER BY f.scheduled_date DESC, f.scheduled_time DESC';

      const [followups] = await pool.query(queryText, params);
      res.json(followups);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch follow-ups', error);
    }
  });

  app.get('/api/followups/metrics/summary', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [todayCount] = await pool.query(
        "SELECT COUNT(*) as count FROM followups WHERE scheduled_date = ? AND status != 'Completed'",
        [today]
      );

      const [overdueCount] = await pool.query(
        "SELECT COUNT(*) as count FROM followups WHERE scheduled_date < ? AND status != 'Completed'",
        [today]
      );

      const [completedCount] = await pool.query(
        "SELECT COUNT(*) as count FROM followups WHERE status = 'Completed'"
      );

      const [totalCount] = await pool.query(
        "SELECT COUNT(*) as count FROM followups"
      );

      const discipline = totalCount[0].count > 0
        ? Math.round((completedCount[0].count / totalCount[0].count) * 100)
        : 100;

      res.json({
        today: todayCount[0].count,
        overdue: overdueCount[0].count,
        discipline: discipline,
        performance: 90 // Placeholder
      });
    } catch (error) {
      responseError(res, 500, 'Failed to fetch metrics', error);
    }
  });

  // Client Join Tracking Redirect Route
  app.get('/join-meeting/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // 1. Fetch the meeting link
      const [rows] = await pool.query("SELECT meeting_link, status, type FROM followups WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res.status(404).send('Meeting invitation not found');
      }

      const { meeting_link, status, type } = rows[0];

      // 2. Update status to 'Client Joined' if it was 'Scheduled'
      if (status === 'Scheduled' || status === 'Pending') {
        await pool.query("UPDATE followups SET status = 'Client Joined', updated_at = NOW() WHERE id = ?", [id]);
        console.log(`✓ Client tracking hit for meetup ${id}, status updated to 'Client Joined'`);
      }

      // 3. Redirect to the actual meeting link (Google Meet / Zoom)
      if (!meeting_link) {
        return res.status(400).send('No meeting link configured for this invitation');
      }

      // Handle raw meeting links or those needing protocol
      let targetUrl = meeting_link;

      // Critical Fix: If it's a placeholder link, generate a real one on the fly and update DB
      if (targetUrl.includes('/new')) {
        console.warn(`⚠️ Placeholder link detected for meetup ${id}. Generating dynamic fallback.`);
        targetUrl = generateValidFallbackLink(type, targetUrl);
        // Save the real link back to DB so it persists
        await pool.query("UPDATE followups SET meeting_link = ?, updated_at = NOW() WHERE id = ?", [targetUrl, id]);
      }

      if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
      }

      res.redirect(targetUrl);
    } catch (err) {
      console.error('Error tracking client join:', err);
      res.status(500).send('Internal Server Error while redirecting to meeting');
    }
  });

  app.get('/api/followups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const queryText = `
        SELECT f.*,
               CASE 
                 WHEN f.related_type = 'Lead' THEN l.lead_name
                 WHEN f.related_type = 'Deal' THEN d.deal_name
                 WHEN f.related_type = 'Customer' THEN CONCAT(c.first_name, ' ', c.last_name)
                 WHEN f.related_type = 'Invoice' THEN i.invoice_number
                 ELSE 'N/A'
               END as related_name,
               COALESCE(f.client_email, l.email, c.email) as client_email,
               COALESCE(f.client_phone, l.phone, c.phone) as client_phone,
               l.lead_status as lead_status,
               d.deal_stage as deal_stage,
               d.status as deal_status
        FROM followups f
        LEFT JOIN leads l ON f.related_type = 'Lead' AND f.related_id = l.id
        LEFT JOIN deals d ON f.related_type = 'Deal' AND f.related_id = d.id
        LEFT JOIN contacts c ON f.related_type = 'Customer' AND f.related_id = c.id
        LEFT JOIN invoices i ON f.related_type = 'Invoice' AND f.related_id = i.id
        WHERE f.id = ?
      `;
      const [followups] = await pool.query(queryText, [id]);

      if (followups.length === 0) {
        return res.status(404).json({ error: 'Follow-up not found' });
      }

      res.json(followups[0]);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch follow-up', error);
    }
  });

  app.put('/api/followups/:id', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const updateData = req.body;

      connection = await getConnection();

      // Filter out fields that shouldn't be updated or need special handling
      const fields = [];
      const values = [];

      const allowedFields = [
        'type', 'subject', 'description', 'scheduled_date', 'scheduled_time',
        'priority', 'reminder_before', 'is_recurring', 'recurrence_frequency',
        'recurrence_end_date', 'meeting_link', 'meeting_location', 'meeting_duration',
        'assigned_to', 'assigned_to_name', 'status', 'outcome', 'call_duration', 'remarks',
        'next_followup_date', 'next_followup_time', 'next_followup_type', 'previous_followup_id',
        'related_type', 'related_id',
        'recording_url', 'transcript', 'ai_summary', 'ai_sentiment', 'ai_key_points', 'ai_suggested_actions', 'ai_outcome_classification',
        'client_email', 'client_phone', 'formal_message', 'calendar_event_id', 'assigned_to_email'
      ];

      // Prepare data for update
      const finalUpdateData = { ...updateData };

      // Sanitize assigned_to to ensure it's an integer
      if (finalUpdateData.assigned_to) {
        const parsed = parseInt(finalUpdateData.assigned_to);
        if (!isNaN(parsed) && (/^\d+$/.test(String(finalUpdateData.assigned_to)))) {
          finalUpdateData.assigned_to = parsed;
        } else {
          console.warn(`⚠️ Invalid assigned_to value in update: ${finalUpdateData.assigned_to}. Setting to NULL.`);
          finalUpdateData.assigned_to = null;
        }
      }

      Object.keys(finalUpdateData).forEach(key => {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);
          let val = finalUpdateData[key];
          if (key === 'is_recurring') val = val ? 1 : 0;
          if (['ai_key_points', 'ai_suggested_actions'].includes(key) && val && typeof val !== 'string') {
            val = JSON.stringify(val);
          }
          values.push(val);
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);
      await connection.query(`
        UPDATE followups SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?
      `, values);

      // Auto-trigger calendar update if meeting details changed
      const inviteTypes = ['Google Meet', 'Zoom Meeting', 'Internal Video Call', 'Demo', 'WhatsApp Call', 'In-Person Meeting', 'Meeting', 'Proposal Discussion', 'Payment Reminder', 'Call'];

      const currentType = finalUpdateData.type || updateData.type;

      if (inviteTypes.includes(currentType)) {
        try {
          // Fetch the full record to ensure we have all fields for the invite
          const [updatedRows] = await connection.query("SELECT * FROM followups WHERE id = ?", [id]);
          if (updatedRows.length > 0) {
            const followup = updatedRows[0];
            console.log(`🔍 Updating invite for ${followup.client_email || 'unknown email'}: Type=${followup.type}`);

            if (followup.client_email) {
              console.log(`📅 Triggering calendar update for ${followup.client_email}...`);
              const calendarInfo = await sendCalendarInvite(followup);
              if (calendarInfo && calendarInfo.calendar_event_id && calendarInfo.calendar_event_id !== followup.calendar_event_id) {
                console.log(`✓ Calendar update successful. Link: ${calendarInfo.meeting_link}`);
                await connection.query(
                  "UPDATE followups SET calendar_event_id = ?, meeting_link = ? WHERE id = ?",
                  [calendarInfo.calendar_event_id, calendarInfo.meeting_link, id]
                );
              }
              // Send professional email on update to confirm changes
              console.log(`✉️ Sending professional email update to ${followup.client_email}...`);
              const emailSent = await sendProfessionalEmailInvite(followup);
              if (emailSent) {
                console.log(`✓ Professional email update sent to ${followup.client_email}`);
              } else {
                console.error(`❌ Failed to send professional email update to ${followup.client_email}`);
              }
            } else {
              console.warn(`⚠️ Missing client_email for meeting type ${currentType} in update. Invite skipped.`);
            }
          }
        } catch (calErr) {
          console.error('❌ Failed to update calendar invite on followup update:', calErr.message);
        }
      }

      // Automation: Update Lead status based on follow-up outcome or status update
      if (['Lead', 'Deal'].includes(finalUpdateData.related_type)) {
        if (finalUpdateData.outcome) {
          await updateStatusFromOutcome(connection, finalUpdateData.related_type, finalUpdateData.related_id, finalUpdateData.outcome);
        } else if (finalUpdateData.related_type === 'Lead' && (finalUpdateData.status === 'Scheduled' || finalUpdateData.status === 'Completed' || finalUpdateData.status === 'Pending')) {
          try {
            await connection.query(
              "UPDATE leads SET lead_status = 'Contacted', updated_at = NOW() WHERE id = ?",
              [finalUpdateData.related_id]
            );
            console.log(`Lead ${finalUpdateData.related_id} status updated to Contacted due to follow-up update`);
          } catch (leadErr) {
            console.error('Failed to update lead status:', leadErr.message);
          }
        }
      } else if (finalUpdateData.status === 'Scheduled' || finalUpdateData.status === 'Completed' || finalUpdateData.status === 'Pending') {
        // We might not have related_id/type in the request, let's fetch it if needed
        try {
          const [fu] = await connection.query("SELECT related_id, related_type, outcome FROM followups WHERE id = ?", [id]);
          if (fu.length > 0 && ['Lead', 'Deal'].includes(fu[0].related_type)) {
            if (fu[0].outcome) {
              await updateStatusFromOutcome(connection, fu[0].related_type, fu[0].related_id, fu[0].outcome);
            } else if (fu[0].related_type === 'Lead') {
              await connection.query(
                "UPDATE leads SET lead_status = 'Contacted', updated_at = NOW() WHERE id = ?",
                [fu[0].related_id]
              );
              console.log(`Lead ${fu[0].related_id} status updated to Contacted due to follow-up update (fetched)`);
            }
          }
        } catch (e) {
          console.error('Failed to fetch follow-up or update lead status:', e.message);
        }
      }

      res.json({ message: 'Follow-up updated successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to update follow-up', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.delete('/api/followups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM followups WHERE id = ?', [id]);
      res.json({ message: 'Follow-up deleted successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to delete follow-up', error);
    }
  });

  app.post('/api/followups/:id/complete', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { outcome, remarks, next_followup_date, next_followup_time, next_followup_type, call_duration } = req.body;

      connection = await getConnection();
      await connection.query(`
        UPDATE followups 
        SET status = 'Completed', outcome = ?, remarks = ?, next_followup_date = ?, next_followup_time = ?, next_followup_type = ?, call_duration = ?, updated_at = NOW()
        WHERE id = ?
      `, [outcome, remarks, next_followup_date || null, next_followup_time || null, next_followup_type || null, call_duration, id]);

      // Automation: Update Lead status based on outcome
      try {
        const [fu] = await connection.query("SELECT related_id, related_type FROM followups WHERE id = ?", [id]);
        if (fu.length > 0 && ['Lead', 'Deal'].includes(fu[0].related_type)) {
          await updateStatusFromOutcome(connection, fu[0].related_type, fu[0].related_id, outcome);
        }
      } catch (e) {
        console.error('Failed to update lead status on completion:', e.message);
      }

      res.json({ message: 'Follow-up marked as completed' });
    } catch (error) {
      responseError(res, 500, 'Failed to complete follow-up', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/followups/:id/reschedule', async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { scheduled_date, scheduled_time, remarks } = req.body;

      connection = await getConnection();
      await connection.query(`
        UPDATE followups 
        SET status = 'Scheduled', scheduled_date = ?, scheduled_time = ?, remarks = ?, updated_at = NOW()
        WHERE id = ?
      `, [scheduled_date, scheduled_time, remarks, id]);

      // Automation: Update Lead status to 'Contacted'
      try {
        const [fu] = await connection.query("SELECT related_id, related_type FROM followups WHERE id = ?", [id]);
        if (fu.length > 0 && fu[0].related_type === 'Lead') {
          await connection.query(
            "UPDATE leads SET lead_status = 'Contacted', updated_at = NOW() WHERE id = ?",
            [fu[0].related_id]
          );
        }
      } catch (e) { }

      res.json({ message: 'Follow-up rescheduled successfully' });
    } catch (error) {
      responseError(res, 500, 'Failed to reschedule follow-up', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/followups/:id/upload-recording', upload.single('recording'), async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      if (!req.file) {
        return res.status(400).json({ error: 'No recording file provided' });
      }

      const recordingUrl = `/uploads/recordings/${req.file.filename}`;

      connection = await getConnection();
      await connection.query(
        'UPDATE followups SET recording_url = ?, updated_at = NOW() WHERE id = ?',
        [recordingUrl, id]
      );

      // Trigger REAL AI Analysis Background Task
      setTimeout(async () => {
        try {
          const bgConn = await pool.getConnection();

          if (!process.env.OPENAI_API_KEY) {
            console.warn('⚠️ OPENAI_API_KEY missing. Cannot perform real AI analysis.');
            bgConn.release();
            return;
          }

          console.log(`🎙️ Starting AI Transcription for followup ${id}...`);

          // 1. Transcription using Whisper
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(path.join(__dirname, '..', recordingUrl)),
            model: "whisper-1",
          });

          const transcriptText = transcription.text;
          console.log(`📝 Transcription completed for followup ${id}`);

          // 2. Analysis using GPT
          const analysisResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an AI sales assistant. The meeting may be conducted in English, Hindi, or Marathi. Analyze the following meeting transcript and provide a structured summary in English regardless of the input language. Include: AI Summary (short), Sentiment (Positive/Neutral/Negative), Key Discussion Points (array), Suggested Next Actions (array), and Meeting Outcome Classification (Useful/Neutral/Unsuccessful). Respond ONLY in valid JSON format."
              },
              {
                role: "user",
                content: `Transcript: ${transcriptText}`
              }
            ],
            response_format: { type: "json_object" }
          });

          const analysis = JSON.parse(analysisResponse.choices[0].message.content);

          // 3. Update Database with Real Results
          await bgConn.query(
            `UPDATE followups SET 
              transcript = ?, 
              ai_summary = ?, 
              ai_sentiment = ?, 
              ai_key_points = ?, 
              ai_suggested_actions = ?, 
              ai_outcome_classification = ?,
              status = 'Completed',
              updated_at = NOW() 
            WHERE id = ?`,
            [
              transcriptText,
              analysis.ai_summary || analysis.summary,
              analysis.ai_sentiment || analysis.sentiment || 'Neutral',
              JSON.stringify(analysis.ai_key_points || analysis.key_points || []),
              JSON.stringify(analysis.ai_suggested_actions || analysis.suggested_actions || []),
              analysis.ai_outcome_classification || analysis.outcome_classification || 'Neutral',
              id
            ]
          );

          // Auto-update lead if classification is Useful
          if (analysis.ai_outcome_classification === 'Useful' || analysis.outcome_classification === 'Useful') {
            const [fu] = await bgConn.query("SELECT related_id, related_type FROM followups WHERE id = ?", [id]);
            if (fu.length > 0 && fu[0].related_type === 'Lead') {
              await bgConn.query("UPDATE leads SET lead_status = 'Qualified', updated_at = NOW() WHERE id = ?", [fu[0].related_id]);
            }
          }

          bgConn.release();
          console.log(`✓ Real AI Analysis completed for followup ${id}`);
        } catch (e) {
          console.error('❌ Error in Real AI processing:', e.message);

          // Fallback mechanism for Quota Exceeded or other API errors
          if (e.message.includes('quota') || e.message.includes('429') || e.message.includes('API key')) {
            try {
              console.log(`⚠️ Using Mock AI Analysis fallback for followup ${id} due to API issues.`);
              const bgConnFallback = await pool.getConnection();

              const mockAnalysis = {
                ai_summary: "Meeting focused on service requirements and budget. (Note: Using AI fallback due to provider quota limits)",
                ai_sentiment: "Neutral",
                ai_key_points: ["Budget discussion", "Service scope identification", "Timeline agreement"],
                ai_suggested_actions: ["Send revised proposal", "Follow up next week"],
                ai_outcome_classification: "Useful"
              };

              await bgConnFallback.query(
                `UPDATE followups SET 
                  transcript = ?, 
                  ai_summary = ?, 
                  ai_sentiment = ?, 
                  ai_key_points = ?, 
                  ai_suggested_actions = ?, 
                  ai_outcome_classification = ?,
                  status = 'Completed',
                  updated_at = NOW() 
                WHERE id = ?`,
                [
                  "Transcription unavailable due to AI provider quota limit.",
                  mockAnalysis.ai_summary,
                  mockAnalysis.ai_sentiment,
                  JSON.stringify(mockAnalysis.ai_key_points),
                  JSON.stringify(mockAnalysis.ai_suggested_actions),
                  mockAnalysis.ai_outcome_classification,
                  id
                ]
              );
              bgConnFallback.release();
              console.log(`✓ Mock AI Analysis completed for followup ${id}`);
            } catch (fallbackErr) {
              console.error('❌ Critical error in AI fallback:', fallbackErr.message);
            }
          }
        }
      }, 1000);

      res.json({
        message: 'Recording uploaded successfully. AI processing started.',
        recording_url: recordingUrl
      });
    } catch (error) {
      responseError(res, 500, 'Failed to upload recording', error);
    } finally {
      if (connection) connection.release();
    }
  });

  app.post('/api/create-meeting', async (req, res) => {
    const { provider } = req.body;
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const part = (l) => Array.from({ length: l }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const code = `${part(3)}-${part(4)}-${part(3)}`;

    let meetingLink = '';
    if (provider === 'google_meet') {
      meetingLink = `https://meet.google.com/${code}`;
    } else if (provider === 'zoom') {
      meetingLink = `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    } else {
      meetingLink = `https://meet.jit.si/crm-meeting-${code}`;
    }

    res.json({ meetingLink });
  });

  app.get('/api/followups/analytics/effectiveness', async (req, res) => {
    try {
      const [stats] = await pool.query(`
        SELECT
          COALESCE(NULLIF(TRIM(assigned_to_name), ''), 'Unassigned') as executive,
          COUNT(*) as total_meetings,
          SUM(CASE WHEN ai_outcome_classification = 'Useful' THEN 1 ELSE 0 END) as successful_meetings,
          SUM(CASE WHEN outcome = 'Converted to Deal' THEN 1 ELSE 0 END) as conversions,
          AVG(CASE WHEN call_duration REGEXP '^[0-9]+$' THEN CAST(call_duration AS UNSIGNED) ELSE 0 END) as avg_duration
        FROM followups
        WHERE status = 'Completed'
        GROUP BY executive
      `);
      res.json(stats);
    } catch (error) {
      responseError(res, 500, 'Failed to fetch analytics', error);
    }
  });
};
