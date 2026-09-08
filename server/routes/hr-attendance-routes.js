const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = (pool) => {
  router.get('/', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const targetDate = req.query.date || today;

      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fajpjwoispcovspnvdoc.supabase.co';
      const SUPABASE_API_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_API_KEY || ''; 
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const authKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_API_KEY;
      
      const allMockData = [
        { id: 1, employee_name: 'Ashwini Khedekar', date: today, check_in: '09:00 AM', check_out: '06:00 PM', status: 'Present', role: 'Developer' },
        { id: 2, employee_name: 'Sanika Mote', date: today, check_in: '09:15 AM', check_out: '06:30 PM', status: 'Present', role: 'Designer' },
        { id: 3, employee_name: 'Abhijit Khedekar', date: today, check_in: '-', check_out: '-', status: 'Absent', role: 'Manager' },
      ];
      
      const mockData = allMockData.filter(d => 
        d.date === targetDate && 
        d.status !== 'Absent' && 
        d.check_in && 
        d.check_in !== '-'
      );

      if (!authKey) {
        console.warn("Supabase API key is missing. Returning mock attendance data.");
        return res.json(mockData);
      }

      try {
        // Fetch directly from the Supabase attendances table, joined with profiles
        const queryParams = `select=*,profiles:user_id(first_name,last_name,employee_id)&order=date.desc`;
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/attendances?${queryParams}`, {
          headers: {
            'apikey': authKey,
            'Authorization': `Bearer ${authKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Map the response to match the UI expectations
        const mappedData = (response.data || []).map(item => {
          const profile = item.profiles || {};
          return {
            id: item.id,
            employee_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
            date: item.date,
            check_in: item.check_in_time || item.check_in || item.clock_in || '-',
            check_out: item.check_out_time || item.check_out || item.clock_out || '-',
            status: item.status || 'Present',
            role: 'Employee'
          };
        });

        // Try to handle different date formats (e.g. '2026-09-08' or 'Sep 08, 2026')
        const targetDateObj = new Date(targetDate);
        const targetDateString = targetDateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); // "Sep 08, 2026"

        // Filter out anyone who hasn't actually checked in, AND ensure the date matches today
        const checkedInEmployees = mappedData.filter(d => {
          const matchesDate = d.date === targetDate || d.date === targetDateString || new Date(d.date).toISOString().split('T')[0] === targetDate;
          const hasCheckedIn = d.status !== 'Absent' && d.check_in && d.check_in !== '-';
          return matchesDate && hasCheckedIn;
        });

        if (checkedInEmployees.length === 0 && response.data.length === 0) {
           console.warn("Supabase returned 0 rows overall. This is likely due to Row Level Security blocking the anon key.");
        }

        res.json(checkedInEmployees);
      } catch (axiosError) {
        if (axiosError?.response?.data?.code === '42P01') {
          console.warn("Supabase 'attendances' table does not exist. Returning mock data.");
          return res.json(mockData);
        }
        throw axiosError;
      }
    } catch (error) {
      console.error('Error fetching HR attendance from Supabase:', error?.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch HR attendance data' });
    }
  });

  return router;
};
