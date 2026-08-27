import React, { useState, useEffect } from 'react';
import { Phone, Mic, MicOff, Volume2, X, PhoneOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function AudioCallPage() {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStarted, setCallStarted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isRinging, setIsRinging] = useState(false);
  const [callerPhone, setCallerPhone] = useState('');

  const caller = {
    name: user?.name || 'User',
    avatar: user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=06B6D4&color=fff&size=200`,
    status: 'Online',
  };

  useEffect(() => {
    let timer;
    if (callStarted) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStarted]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const recordCall = async (phone) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || API_BASE_URL + '';
      await fetch(`${apiUrl}/call-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caller_name: user?.name || 'User',
          caller_avatar: user?.avatar,
          phone_number: phone,
          call_type: 'Audio Call',
          call_direction: 'Outgoing',
          duration: 0,
          notes: 'Audio call'
        })
      });
    } catch (error) {
      console.error('Error recording call:', error);
    }
  };

  const handleStartCall = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }
    setCallerPhone(phoneNumber);
    setShowPhoneModal(false);
    setIsRinging(true);

    setTimeout(() => {
      setIsRinging(false);
      setCallStarted(true);
      recordCall(phoneNumber);
    }, 2000);
  };

  const handleEndCall = () => {
    setCallStarted(false);
    setIsRinging(false);
    setCallDuration(0);
    setPhoneNumber('');
    setCallerPhone('');
    setShowPhoneModal(false);
  };

  const openPhoneModal = () => {
    setShowPhoneModal(true);
  };

  return (
    <div className="w-full h-[calc(100vh-80px)] bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-white ">
        <div className="flex items-center gap-3">
          <img
            src={caller.avatar}
            className="w-10 h-10 rounded-full object-cover"
            alt={caller.name}
          />
          <div>
            <h2 className="text-xs   text-gray-900">{caller.name}</h2>
            <p className="text-xs text-gray-500">{callStarted ? 'Ongoing' : caller.status}</p>
          </div>
        </div>
        {!callStarted && !isRinging && (
          <button
            onClick={openPhoneModal}
            className="p-2  bg-red-600 hover:bg-red-700 text-white rounded   text-xs  flex items-center gap-2 transition-colors shadow-md">
            <Phone className="w-4 h-4" />
            Call
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-centerp-3  bg-gradient-to-b from-blue-50 to-white">
        {/* Caller Avatar with animation */}
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center mb-6 shadow-lg transition-all ${isRinging ? 'animate-pulse ring-4 ring-cyan-300' : callStarted ? 'ring-2 ring-green-400' : ''
          }`}>
          <img
            src={caller.avatar}
            className="w-full h-full rounded-full object-cover"
            alt={caller.name}
          />
        </div>

        {/* Caller Info */}
        <h3 className="text-xl  text-gray-900 mb-2">{caller.name}</h3>

        {/* Phone Number Display */}
        {callerPhone && (
          <p className="text-lg text-white   mb-2">{callerPhone}</p>
        )}

        {/* Call Status */}
        {isRinging ? (
          <div className="text-center mb-12">
            <p className="text-lg text-gray-600   animate-pulse">Calling...</p>
          </div>
        ) : callStarted ? (
          <div className="text-center mb-12">
            <p className="text-2xl text-green-600  mb-2">{formatDuration(callDuration)}</p>
            <p className="text-gray-600">Voice Call in progress</p>
          </div>
        ) : (
          <div className="text-center mb-12">
            <p className="text-gray-600">Ready to call</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {(callStarted || isRinging) && (
        <div className="border-tp-3  flex items-center justify-center gap-6 bg-white shadow-lg">
          {callStarted && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md ${isMuted ? 'bg-red-100 text-red ' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
          )}

          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg">
            <PhoneOff className="w-7 h-7" />
          </button>

          {callStarted && (
            <button className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all shadow-md">
              <Volume2 className="w-7 h-7" />
            </button>
          )}
        </div>
      )}

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-2xlp-3  max-w-md w-full mx-4 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl  text-gray-900">Start Audio Call</h3>
                <p className="text-xs text-gray-500 mt-1">Enter phone number to call</p>
              </div>
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneNumber('');
                }}
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs   text-gray-700 mb-2">Mobile Number *</label>
                <div className="flex items-center gap-2 p-2  border border-gray-300 rounded  focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-transparent">
                  <Phone className="w-5 h-5 text-[#1F2020]" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="flex-1 outline-none bg-transparent text-gray-900"
                    autoFocus
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded ">
                Enter the mobile number of the contact you want to call. The call will be recorded in your call history.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPhoneModal(false);
                    setPhoneNumber('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded  text-gray-700 hover:bg-gray-50 transition-colors "
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartCall}
                  disabled={!phoneNumber.trim()}
                  className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded  hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors  flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
