import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleGate = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleGate;
