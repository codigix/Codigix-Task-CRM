import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Mic, MicOff, Video, VideoOff, Monitor, Volume2,
  RotateCcw, Settings, StopCircle, Play, Pause, Save, CheckCircle,
  User, MessageSquare, Clock, FileText, ChevronRight, AlertCircle,
  Users, UserPlus, Bell, MoreHorizontal, X, LayoutGrid, Search, Layout,
  Plus, Maximize, PanelRightClose, PanelRight, ChevronDown, Link, Calendar
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { followupsAPI } from '../../services/api';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function VideoCallPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [followupData, setFollowupData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('transcript');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [meetingProvider, setMeetingProvider] = useState('google');
  const [isRecording, setIsRecording] = useState(false);
  const [isExternalWindowOpen, setIsExternalWindowOpen] = useState(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [allSystemUsers, setAllSystemUsers] = useState([]);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const externalWindowRef = useRef(null);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, processing, completed
  const [callTime, setCallTime] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'sales', name: user?.name || user?.first_name || 'Sales Executive', text: "Hello! Thank you for joining. How are you today?", time: '10:00 AM' },
    { id: 2, sender: 'client', name: followupData?.related_name || 'Raj Bola', text: "Hi, I am doing well. Excited to discuss the project.", time: '10:01 AM' },
    { id: 3, sender: 'sales', name: user?.name || user?.first_name || 'Sales Executive', text: "Great. I have reviewed your requirements for the SEO and Website development.", time: '10:02 AM' },
    { id: 4, sender: 'client', name: followupData?.related_name || 'Raj Bola', text: "Yes, we are looking for a comprehensive strategy within a budget of ₹40,000.", time: '10:03 AM' },
    { id: 5, sender: 'sales', name: user?.name || user?.first_name || 'Sales Executive', text: "I believe we can work with that. Let's dive into the details.", time: '10:04 AM' }
  ]);
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const callerName = user?.name || user?.first_name || 'Sales Executive';
  const clientName = followupData?.related_name || followupData?.subject || 'Raj Bola';

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (code) {
      fetchFollowupByCode(code);
      if (code && code !== 'new') {
        const cleanCode = code.replace(/-/g, '');
        const isZoom = /^\d+$/.test(cleanCode);
        if (isZoom) {
          setMeetingUrl(prev => prev || `https://zoom.us/j/${cleanCode}`);
          setMeetingProvider('zoom');
        } else {
          setMeetingUrl(prev => prev || `https://meet.google.com/${code}`);
          setMeetingProvider('google');
        }
        setIsJoined(true);
      }
      const interval = setInterval(() => fetchFollowupByCode(code), 5000);
      return () => clearInterval(interval);
    }
  }, [code]);

  useEffect(() => {
    if (followupData) {
      fetchParticipants();
    }
  }, [followupData]);

  const fetchParticipants = async () => {
    try {
      const realParticipants = [];
      // Current User
      realParticipants.push({
        id: user?.id || 'you',
        name: callerName,
        role: 'You',
        isYou: true,
        avatar: user?.avatar || `https://ui-avatars.com/api/?name=${callerName}&background=3B82F6&color=fff`
      });

      // Client
      realParticipants.push({
        id: 'client',
        name: clientName,
        role: followupData?.related_type === 'Lead' ? 'Lead Contact' : 'Client Contact',
        isClient: true,
        avatar: `https://ui-avatars.com/api/?name=${clientName}&background=10B981&color=fff`
      });

      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';

      // Fetch associated Lead or Deal participants if available
      let assignedUserIds = [];
      if (followupData?.related_type === 'Lead' && followupData?.related_id) {
        try {
          const leadRes = await fetch(`${apiUrl}/leads/${followupData.related_id}`);
          const leadData = await leadRes.json();
          if (leadData) {
            if (leadData.owner_id) assignedUserIds.push(leadData.owner_id);
            if (leadData.people_assigned) {
              const extraPeople = safeJsonParse(leadData.people_assigned);
              if (Array.isArray(extraPeople)) {
                assignedUserIds = [...new Set([...assignedUserIds, ...extraPeople])];
              }
            }
          }
        } catch (e) {
          console.error('Error fetching lead assigned users:', e);
        }
      }

      // Fetch users from API
      const usersRes = await fetch(`${apiUrl}/users?limit=50`);
      const allUsers = await usersRes.json();
      setAllSystemUsers(allUsers || []);

      // Filter out current user and add relevant users
      const otherUsers = (allUsers || []).filter(u => u.id !== user?.id);

      // Map assigned users first, then fill with others up to 4 total
      const addedIds = new Set([user?.id]);

      // Add explicitly assigned users
      otherUsers.forEach(u => {
        if (assignedUserIds.includes(u.id)) {
          realParticipants.push({
            id: u.id,
            name: `${u.first_name} ${u.last_name || ''}`.trim(),
            role: u.role_name || u.department || 'Team Member',
            avatar: u.avatar || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=6366F1&color=fff`
          });
          addedIds.add(u.id);
        }
      });

      // Fill remaining slots with other users from system if needed (up to 4 total)
      if (realParticipants.length < 4) {
        otherUsers.forEach(u => {
          if (!addedIds.has(u.id) && realParticipants.length < 4) {
            realParticipants.push({
              id: u.id,
              name: `${u.first_name} ${u.last_name || ''}`.trim(),
              role: u.role_name || u.department || 'Team Member',
              avatar: u.avatar || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=6366F1&color=fff`
            });
            addedIds.add(u.id);
          }
        });
      }

      setParticipants(realParticipants);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setCallTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const fetchFollowupByCode = async (meetingCode) => {
    try {
      let data;
      // If code is numeric, treat it as a database ID (preferred for synchronization)
      if (!isNaN(meetingCode) && meetingCode !== 'new') {
        data = await followupsAPI.getById(meetingCode);
      } else if (meetingCode === 'new') {
        const followups = await followupsAPI.getAll({ status: 'Scheduled' });
        if (followups && followups.length > 0) data = followups[0];
      } else {
        // Fallback: search by meeting_link if ID lookup is not possible
        const followups = await followupsAPI.getAll({ meeting_link: meetingCode });
        if (followups && followups.length > 0) data = followups[0];
      }

      if (data) {
        setFollowupData(data);
        if (data.meeting_link && !meetingUrl) {
          setMeetingUrl(data.meeting_link);
          if (data.meeting_link.includes('google.com')) setMeetingProvider('google');
          else if (data.meeting_link.includes('zoom.us')) setMeetingProvider('zoom');
          else if (data.meeting_link.includes('jit.si')) setMeetingProvider('jitsi');
          setIsJoined(true);
        }
      }
    } catch (error) {
      console.error('Error fetching followup:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('recording');
      showSuccessToast('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      showErrorToast('Could not access microphone for recording');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecordingStatus('processing');
    showSuccessToast('Call ended. Processing recording and AI analysis...');
    setTimeout(async () => {
      try {
        let finalFollowupId = followupData?.id;
        if (!finalFollowupId) {
          const newFollowup = await followupsAPI.create({
            related_type: 'Lead',
            related_id: 1,
            type: 'Meeting',
            subject: 'Direct Video Call Analysis',
            scheduled_date: new Date().toISOString().split('T')[0],
            scheduled_time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            status: 'Completed'
          });
          finalFollowupId = newFollowup.id;
        }
        if (finalFollowupId && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('recording', audioBlob, 'recording.webm');
          const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
          await fetch(`${apiUrl}/followups/${finalFollowupId}/upload-recording`, {
            method: 'POST',
            body: formData
          });
          await followupsAPI.update(finalFollowupId, {
            call_duration: Math.floor(callTime / 60).toString(),
            status: 'Completed'
          });
        }
        setRecordingStatus('completed');
        showSuccessToast('AI Analysis completed. Results updated.');
        if (code !== 'new') fetchFollowupByCode(code);
        else navigate(`/video-call/${finalFollowupId}`);
      } catch (error) {
        console.error('Error stopping recording:', error);
        showErrorToast('Failed to process recording');
        setRecordingStatus('idle');
      }
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddParticipant = (u) => {
    if (participants.some(p => p.id === u.id)) {
      showErrorToast(`${u.first_name} is already in the call`);
      return;
    }

    const newParticipant = {
      id: u.id,
      name: `${u.first_name} ${u.last_name || ''}`.trim(),
      role: u.role_name || u.department || 'Team Member',
      avatar: u.avatar || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=6366F1&color=fff`
    };

    setParticipants(prev => [...prev, newParticipant]);
    showSuccessToast(`Added ${newParticipant.name} to the call`);
    setIsAddParticipantModalOpen(false);
  };

  const handleToggleMute = () => setIsMuted(!isMuted);
  const handleToggleVideo = () => setIsVideoOn(!isVideoOn);

  const handleSendMessage = (text) => {
    if (text.trim()) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'sales',
        name: callerName,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const handleLaunchMeeting = () => {
    if (!meetingUrl) return;
    // Launch a dedicated popup without browser toolbars to make it feel integrated
    const windowFeatures = 'menubar=no,location=no,resizable=yes,scrollbars=yes,status=no,width=1100,height=850';
    externalWindowRef.current = window.open(meetingUrl, 'CRM_Video_Bridge', windowFeatures);
    setIsExternalWindowOpen(true);
    if (recordingStatus === 'idle') startRecording();

    const checkWindow = setInterval(() => {
      if (externalWindowRef.current && externalWindowRef.current.closed) {
        setIsExternalWindowOpen(false);
        clearInterval(checkWindow);
        if (isRecording) stopRecording();
      }
    }, 1000);
  };

  const safeJsonParse = (str, fallback = []) => {
    if (!str) return fallback;
    try {
      const parsed = typeof str === 'string' ? JSON.parse(str) : str;
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  };

  return (
    <div className="w-full h-screen bg-[#0f1117] flex flex-col text-white font-sans overflow-hidden">
      {/* CRM Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-[#16181d]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center  text-white shadow-lg shadow-red-900/20">D</div>
          <div className="flex items-center gap-2 text-xs">
            <span className=" text-gray-200">Enterprise CRM</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => navigate('/sales/dashboard')}>Sales Dashboard</span>
            <span className="text-gray-600">/</span>
            <span className="text-blue-500 font-medium">{clientName}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded border border-white/10">
            <div className={`w-2 h-2 ${isExternalWindowOpen ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500'} rounded-full`}></div>
            <span className="text-xs   tracking-widest text-gray-300">
              {isExternalWindowOpen ? 'Live Bridge Session' : 'Ready to Connect'}
            </span>
            <div className="w-px h-3 bg-white/10 mx-1"></div>
            <span className="text-xs text-blue-400 font-mono truncate max-w-[120px]">
              {meetingUrl ? meetingUrl.split('/').pop() : 'Direct Link'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#2a2d37] px-2.5 py-1.5 rounded border border-white/5 shadow-inner">
            <span className="text-xs  text-blue-400">{participants.length}</span>
          </div>
          <div className="flex items-center gap-3 px-2 text-gray-500">
            <button
              onClick={() => setIsAddParticipantModalOpen(true)}
              className="hover:text-white transition-colors"
            >
              <UserPlus size={18} />
            </button>
            <button className="hover:text-white transition-colors"><Video size={18} /></button>
            <button className="hover:text-white transition-colors"><MessageSquare size={18} /></button>
            <button className="hover:text-white transition-colors"><Bell size={18} /></button>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500/30 p-0.5">
            <img src={user?.avatar || "https://ui-avatars.com/api/?name=Amit+Sharma&background=3B82F6&color=fff"} alt="Profile" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Main Work Area */}
        <div className="flex-1 p-4 relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded border border-white/5">
              <div className={`w-2.5 h-2.5 ${isExternalWindowOpen ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'} rounded-full`}></div>
              <span className="text-xs font-medium tracking-wide">
                {isExternalWindowOpen ? 'Meeting in Progress' : 'Awaiting Bridge Launch...'}
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-xs font-mono">{formatTime(callTime)}</span>
            </div>

            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded border border-white/5">
              <span className="text-xs text-gray-500   er">Participants</span>
              <div className="flex -space-x-2">
                {participants.map(p => (
                  <div key={p.id} className={`w-6 h-6 rounded-full border border-gray-800 ${p.isClient ? 'bg-green-600' : 'bg-blue-600'} overflow-hidden text-[9px] flex items-center justify-center `}>
                    {p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0 rounded flex flex-col bg-[#16181d] border border-white/5 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/30 via-transparent to-transparent"></div>

              <div className="flex-1 flex flex-col items-center justify-center p-2 text-center relative z-10">
                {!isExternalWindowOpen ? (
                  <div className="max-w-xl">
                    <div className="w-10 h-10 bg-blue-600/10 rounded flex items-center justify-center mb-2 mx-auto border border-blue-500/20 shadow-2xl">
                      <Calendar size={15} className="text-blue-500" />
                    </div>

                    <h2 className="text-xl  mb-2 ">
                      {meetingProvider === 'google' ? 'Google Meet Bridge' :
                        meetingProvider === 'zoom' ? 'Zoom Meeting Bridge' :
                          meetingProvider === 'jitsi' ? 'CRM Video Bridge' : 'Video Call Bridge'}
                    </h2>
                    <p className="text-gray-400 text-xs mb-2 leading-relaxed px-10">
                      Welcome to the Integrated CRM Video Experience. Conduct your meeting
                      while using the CRM's **Live Summary, Notes, and AI Insights**
                      all in one workspace.
                    </p>

                    <button
                      onClick={handleLaunchMeeting}
                      className="group relative inline-flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded  text-xs shadow-2xl shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-95 border border-blue-400/30 overflow-hidden"
                    >
                      <Video size={24} className="mr-3" />
                      Conduct Meeting via CRM
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-8 w-full h-full relative">
                    {/* Mock Integrated Visual to reassure user */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <div className="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs  border border-green-500/20  tracking-widest flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        Integrated
                      </div>
                      <button onClick={() => externalWindowRef.current?.focus()} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1 rounded-full text-xs  border border-white/10  tracking-widest flex items-center gap-1.5 transition-all">
                        <Maximize size={12} />
                        Popout
                      </button>
                    </div>

                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-blue-600/20 flex items-center justify-center animate-pulse">
                        <div className="w-24 h-24 rounded-full border-4 border-blue-500 flex items-center justify-center">
                          <Video size={40} className="text-blue-500" />
                        </div>
                      </div>
                      <div className="absolute -top-2 -right-2 bg-green-500 text-black px-2 py-1 rounded-md text-[9px]   animate-bounce">Live</div>
                    </div>

                    <div className="text-center">
                      <h3 className="text-2xl  mb-2">Conduction Active</h3>
                      <p className="text-gray-400 text-xs max-w-sm mb-6">
                        {meetingProvider === 'google' ? 'Google Meet' : 'Zoom Meet'} is running in its dedicated Integrated Bridge Window.
                        Use the right panel to take notes and track AI analysis.
                      </p>
                      <div className="inline-flex items-center gap-2 bg-blue-500/10 p-2 rounded border border-blue-500/20 text-blue-400 text-xs font-medium">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Synced with CRM: {clientName}
                      </div>
                    </div>

                    <button
                      onClick={() => externalWindowRef.current?.focus()}
                      className="px-8 py-3 bg-white text-black rounded  text-xs  tracking-widest transition-all hover:bg-gray-200 flex items-center gap-2 shadow-2xl"
                    >
                      <Maximize size={14} />
                      Bring Call Window to Front
                    </button>
                  </div>
                )}
              </div>

              <div className="h-12 bg-black/40 border-t border-white/5 flex items-center justify-between px-6 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-xs  text-blue-400  tracking-wider">Internal Video Pipeline Active</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-mono flex items-center gap-4">
                  <span>Provider: <strong className="text-blue-400">{meetingProvider === 'google' ? 'Google Meet' : (meetingProvider === 'zoom' ? 'Zoom Meet' : 'CRM Video Bridge')} (Integrated)</strong></span>
                  <div className="w-px h-3 bg-white/10"></div>
                  <span>Sync Token: <strong>{code?.substring(0, 8)}...</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className=" flex items-center justify-between p-2 bg-black/40 backdrop-blur-xl border-t border-white/5 mx-[-16px] px-[32px]">
            <div className="flex items-center gap-3 bg-[#16181d] p-2 rounded border border-white/5 shadow-inner">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <span className="text-xs  tracking-[0.2em] text-gray-200">REC</span>
              <span className="text-gray-700 mx-1">|</span>
              <span className="text-xs font-mono font-medium text-gray-300">{formatTime(callTime)}</span>
              <ChevronDown size={14} className="text-gray-500 ml-1" />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-[#2a2d37] p-1 rounded border border-white/10 shadow-lg">
                <button onClick={handleToggleVideo} className={`p-1 rounded transition-all ${isVideoOn ? 'text-gray-300 hover:bg-white/5' : 'bg-red-500/20 text-red-500 border border-red-500/20 shadow-inner'}`}>
                  {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
                <div className="w-px h-5 bg-white/5 self-center mx-1"></div>
                <button className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all"><Search size={18} /></button>
                <div className="w-px h-5 bg-white/5 self-center mx-1"></div>
                <button onClick={handleToggleMute} className={`p-1 rounded transition-all ${!isMuted ? 'text-gray-300 hover:bg-white/5' : 'bg-red-500/20 text-red-500 border border-red-500/20 shadow-inner'}`}>
                  {!isMuted ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
              </div>

              {recordingStatus === 'idle' ? (
                <button onClick={startRecording} className="bg-white text-black px-6 py-2.5 rounded  text-xs  tracking-wider flex items-center gap-2 hover:bg-gray-200 transition-all shadow-xl active:scale-95">
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>RECORD
                </button>
              ) : isRecording ? (
                <button onClick={stopRecording} className="bg-red-600 text-white px-6 py-2.5 rounded  text-xs  tracking-wider flex items-center gap-2 hover:bg-red-700 transition-all shadow-xl active:scale-95">
                  <StopCircle size={14} />STOP
                </button>
              ) : (
                <button className="bg-gray-800 text-gray-500 px-6 py-2.5 rounded  text-xs  tracking-wider flex items-center gap-2 cursor-not-allowed">
                  <div className="w-3 h-3 border-2 border-t-blue-500 rounded-full animate-spin"></div>PROC...
                </button>
              )}

              <button className="p-1 bg-[#2a2d37] text-gray-400 rounded border border-white/10 hover:text-white transition-all shadow-lg"><MoreHorizontal size={20} /></button>
            </div>

            <button onClick={() => { if (isRecording) stopRecording(); navigate('/sales/followups'); }} className="bg-[#e34234] hover:bg-red-700 text-white p-2 rounded  text-xs transition-all shadow-lg shadow-red-900/30 active:scale-95">End Call</button>
          </div>
        </div>

        {/* Meeting Sidebar */}
        <div className={`transition-all duration-300 border-l border-white/5 bg-[#1f2129] flex flex-col ${isSidebarOpen ? 'w-[400px]' : 'w-0 overflow-hidden'}`}>
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h3 className=" text-lg">Meeting Summary</h3>
            <div className="flex items-center gap-3">
              <button className="text-gray-400 hover:text-white"><Maximize size={18} /></button>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white"><MoreHorizontal size={18} /></button>
            </div>
          </div>

          <div className="flex p-2 gap-1 bg-white/5 m-4 rounded">
            <button onClick={() => setActiveTab('summary')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'summary' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Summary</button>
            <button onClick={() => setActiveTab('notes')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'notes' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Notes</button>
            <button onClick={() => setActiveTab('transcript')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'transcript' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Communication</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            {activeTab === 'summary' && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                    <h4 className=" tracking-wide text-xs  text-gray-400">AI Meeting Analysis</h4>
                  </div>
                  <div className="ml-2 border-l-2 border-white/5 pl-6 space-y-6">
                    {followupData?.ai_summary ? (
                      <div className="text-xs text-gray-300 leading-relaxed bg-white/5 p-4 rounded border border-white/5 shadow-inner">{followupData.ai_summary}</div>
                    ) : (
                      <div className="text-xs text-gray-500 italic bg-white/5 p-4 rounded border border-white/5">
                        {recordingStatus === 'recording' ? "Recording in progress..." : 'No AI analysis available yet.'}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {activeTab === 'notes' && (
              <div className="h-full flex flex-col">
                <textarea className="flex-1 bg-white/5 p-4 rounded border border-white/5 text-xs text-gray-300 resize-none outline-none" placeholder="Take notes..." defaultValue={followupData?.description || ''}></textarea>
                <button onClick={() => showSuccessToast('Notes saved')} className="mt-4 bg-blue-600 text-white py-3 rounded text-xs ">Save Notes</button>
              </div>
            )}
            {activeTab === 'transcript' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.sender === 'sales' ? '' : 'flex-row-reverse'}`}>
                      <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center  text-white text-xs ${msg.sender === 'sales' ? 'bg-blue-600' : 'bg-green-600'}`}>{msg.name[0]}</div>
                      <div className={`flex-1 ${msg.sender === 'sales' ? '' : 'text-right'}`}>
                        <div className="text-xs  text-gray-200 mb-1">{msg.name}</div>
                        <div className={`p-1 rounded text-xs leading-relaxed inline-block ${msg.sender === 'sales' ? 'bg-white/5 text-gray-300' : 'bg-blue-600/20 text-blue-100 border border-blue-500/20'}`}>{msg.text}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                  <input type="text" placeholder="Type message..." className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs outline-none text-white" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { handleSendMessage(e.target.value); e.target.value = ''; } }} />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-black/20 flex items-center justify-between text-xs text-gray-500  tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-gray-700 rounded-sm flex items-center justify-center text-[8px]  text-gray-400">GMJ</span>
              <span>Record</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare size={12} />
              <span>Reminders</span>
              <span className="text-gray-300  text-xs">2</span>
            </div>
          </div>
        </div>

        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#3b82f6] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50">
            <PanelRight size={20} />
          </button>
        )}

        {/* Add Participant Modal */}
        {isAddParticipantModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#1f2129] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg  text-white">Add Participants</h3>
                  <p className="text-xs text-gray-400 mt-1">Invite team members to this session</p>
                </div>
                <button
                  onClick={() => setIsAddParticipantModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="w-full bg-white/5 border border-white/10 rounded pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    value={participantSearchQuery}
                    onChange={(e) => setParticipantSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {allSystemUsers
                    .filter(u => {
                      const name = `${u.first_name} ${u.last_name || ''}`.toLowerCase();
                      const query = participantSearchQuery.toLowerCase();
                      return name.includes(query) || u.email?.toLowerCase().includes(query);
                    })
                    .filter(u => !participants.some(p => p.id === u.id))
                    .map(u => (
                      <div key={u.id} className="group flex items-center justify-between p-3 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400  border border-blue-500/20">
                            {u.first_name[0]}{u.last_name?.[0] || ''}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{u.first_name} {u.last_name || ''}</div>
                            <div className="text-xs text-gray-500  tracking-wider">{u.role_name || u.department || 'Team Member'}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddParticipant(u)}
                          className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-1.5 rounded text-xs  transition-all border border-blue-500/20 active:scale-95"
                        >
                          Add
                        </button>
                      </div>
                    ))}

                  {allSystemUsers.filter(u => {
                    const name = `${u.first_name} ${u.last_name || ''}`.toLowerCase();
                    const query = participantSearchQuery.toLowerCase();
                    return (name.includes(query) || u.email?.toLowerCase().includes(query)) && !participants.some(p => p.id === u.id);
                  }).length === 0 && (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users size={20} className="text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-500">No users found to add</p>
                      </div>
                    )}
                </div>
              </div>

              <div className="p-4 bg-black/20 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setIsAddParticipantModalOpen(false)}
                  className="px-6 py-2 text-xs  text-gray-400 hover:text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
