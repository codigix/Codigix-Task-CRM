import React from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userWorkspacePath, slug, rememberAfterLogin } from '../../utils/workspacePath';

/**
 * /open-task/:key — the link in task emails. An email can't know the reader's own route, so this
 * sends them to their Kanban board with the ticket opened (?ticketKey=), the same place the bell
 * notification takes them. Signed out, it asks them to log in and then continues here.
 * Older emails linked /it/tasks?ticketKey=… (and /marketing/…), which land here too.
 */
const OpenTaskRedirect = () => {
  const { key } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const ticketKey = String(key || params.get('ticketKey') || '').trim();

  if (!user) {
    rememberAfterLogin(`/open-task/${encodeURIComponent(ticketKey)}`);
    return <Navigate to="/login" replace />;
  }

  const base = userWorkspacePath(user) || `/it/${slug(user.role) || 'employee'}/${slug(user.username || user.first_name || 'user')}`;
  return <Navigate to={`${base}/kanban${ticketKey ? `?ticketKey=${encodeURIComponent(ticketKey)}` : ''}`} replace />;
};

export default OpenTaskRedirect;
