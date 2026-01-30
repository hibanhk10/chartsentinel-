import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const { register, loading, error } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      onClose();
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-background-dark text-white p-8 rounded-2xl max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6">Sign Up</h2>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            {formData.password !== formData.confirmPassword && formData.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || formData.password !== formData.confirmPassword}
            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-primary hover:underline"
            >
              Login
            </button>
          </p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
};

export default RegisterModal;
