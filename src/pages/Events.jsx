import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Calendar, MapPin, Clock, Plus, X, PlusCircle } from 'lucide-react';
import './pages.css';

export const Events = ({ data, loading, refreshData }) => {
  const { canManageEvents } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [type, setType] = useState('Meeting');
  const [description, setDescription] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Events...</div>;
  }

  const { events = [] } = data;
  const todayStr = new Date().toISOString().split('T')[0];

  // Split events into Upcoming vs Past
  const upcomingEvents = events
    .filter(e => e["Date"] >= todayStr)
    .sort((a, b) => a["Date"].localeCompare(b["Date"]));

  const pastEvents = events
    .filter(e => e["Date"] < todayStr)
    .sort((a, b) => b["Date"].localeCompare(a["Date"])); // Reverse chronological for past events

  const currentList = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!eventName || !date || !time || !venue) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const result = await api.addEvent({
        eventName,
        date,
        time,
        venue,
        type,
        description
      });

      if (result.success) {
        // Reset form
        setEventName('');
        setDate('');
        setTime('');
        setVenue('');
        setType('Meeting');
        setDescription('');
        setShowAddModal(false);
        // Refresh global state
        await refreshData();
      } else {
        setError(result.error || 'Failed to create event');
      }
    } catch (err) {
      setError('Error creating event');
    } finally {
      setSubmitting(false);
    }
  };

  const getMonthName = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleString('en-US', { month: 'short' });
  };

  const getDayNumber = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.getDate();
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Events & Meetings</h1>
          <p className="page-subtitle">Manage club gatherings, projects and functions</p>
        </div>
        {canManageEvents && (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn btn-primary"
          >
            <Plus size={16} />
            Create Event
          </button>
        )}
      </div>

      {/* Tab controls */}
      <div className="tab-container">
        <button 
          onClick={() => setActiveTab('upcoming')} 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button 
          onClick={() => setActiveTab('past')} 
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
        >
          Past ({pastEvents.length})
        </button>
      </div>

      {/* Events Feed */}
      {currentList.length > 0 ? (
        <div className="events-list">
          {currentList.map((event) => (
            <div key={event["Event ID"]} className="card event-card">
              <div className="event-date-badge">
                <span className="event-date-month">{getMonthName(event["Date"])}</span>
                <span className="event-date-day">{getDayNumber(event["Date"])}</span>
              </div>
              <div className="event-details-meta">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 className="event-title-text">{event["Event Name"]}</h3>
                  <span className={`event-type-pill ${event["Type"] ? event["Type"].toLowerCase() : ''}`}>
                    {event["Type"]}
                  </span>
                </div>
                
                <div className="event-sub-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    <span>{formatDisplayDate(event["Date"])}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    <span>{event["Time"]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} />
                    <span>{event["Venue"]}</span>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {event["Description"]}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Calendar size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p>No {activeTab} events scheduled.</p>
        </div>
      )}

      {/* ADD EVENT MODAL OVERLAY */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowAddModal(false)}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={24} style={{ color: 'var(--rotary-blue)' }} />
              Schedule New Event
            </h2>

            {error && (
              <div className="login-error" style={{ marginBottom: '16px' }}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Event / Meeting Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Weekly Club Assembly"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 7:00 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Venue *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rotary Hall, Trivandrum"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event Category</label>
                <select
                  className="form-control"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="Meeting">Meeting (Club Assembly)</option>
                  <option value="Service">Service Project (Charity/Drive)</option>
                  <option value="Social">Social Gathering (Party/District event)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  style={{ height: '80px', resize: 'none' }}
                  placeholder="Provide meeting agendas or project details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Add Event'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
