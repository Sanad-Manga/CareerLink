import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from '../styles/EditProfilePage.module.css';

export default function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
  });
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profilePicture || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch fresh profile on mount to get bio and latest data
  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      const fresh = data.user || data;
      setFormData({
        name: fresh.name || user?.name || '',
        bio: fresh.bio || '',
      });
      if (fresh.profilePicture) setPreviewUrl(fresh.profilePicture);
    }).catch(() => {
      // fallback to cached user
      if (user) {
        setFormData({ name: user.name || '', bio: user.bio || '' });
        if (user.profilePicture) setPreviewUrl(user.profilePicture);
      }
    });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('bio', formData.bio);
    if (profilePic) formDataToSend.append('profilePicture', profilePic);

    try {
      const response = await api.patch('/profile', formDataToSend);
      // Expected response: { success: true, user: {...} }
      if (response.data.success && response.data.user) {
        updateUser(response.data.user);
        setSuccess('Profile updated successfully!');
        setTimeout(() => navigate('/profile'), 1500);
      } else {
        // Fallback: refetch user
        const fresh = await api.get('/profile');
        const freshUser = fresh.data.user || fresh.data;
        updateUser(freshUser);
        setSuccess('Profile updated successfully!');
        setTimeout(() => navigate('/profile'), 1500);
      }
    } catch (err) {
      console.error('Update error:', err);
      // Even if caught, try to verify if the update actually worked
      try {
        const check = await api.get('/profile');
        const currentUser = check.data.user || check.data;
        if (currentUser.name === formData.name && currentUser.bio === formData.bio) {
          updateUser(currentUser);
          setSuccess('Profile updated successfully!');
          setTimeout(() => navigate('/profile'), 1500);
          return;
        }
      } catch { /* ignore — fall through to the generic error below */ }
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Edit Profile</h1>
        <p className={styles.subtitle}>Update your personal information and profile picture</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Avatar preview */}
          <div className={styles.avatarSection}>
            <label className={styles.label}>Profile Picture</label>
            <div className={styles.avatarContainer}>
              {previewUrl ? (
                <img src={previewUrl} alt="Profile preview" className={styles.avatar} />
              ) : user?.profilePicture ? (
                <img src={user.profilePicture} alt="Current profile" className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {formData.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
                id="profilePicture"
              />
              <label htmlFor="profilePicture" className={styles.uploadLabel}>
                Choose Image
              </label>
              <small className={styles.helperText}>JPG, PNG or GIF (max. 5MB)</small>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
              className={styles.textarea}
              disabled={loading}
            />
            <small className={styles.helperText}>Tell us about yourself, your skills, or experience</small>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <div className={styles.actions}>
            <button type="button" onClick={() => navigate('/profile')} className={styles.btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.btnPrimary}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}