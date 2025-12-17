import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';
import { loginStart, loginSuccess, loginFailure, clearError } from '../store/slices/authSlice';
import api from '../services/api';
import PasswordStrengthIndicator from '../components/Auth/PasswordStrengthIndicator';
import LoadingButton from '../components/common/LoadingButton';
import { validateLoginForm, validateRegisterForm, LoginFormData, RegisterFormData } from '../utils/validation';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AuthPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    language: '',
    currentLevel: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    dispatch(clearError());
  }, [tabValue, dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setFormErrors({});
  };

  const validateLoginFormData = () => {
    const validation = validateLoginForm(loginForm as LoginFormData);
    setFormErrors(validation.errors);
    return validation.isValid;
  };

  const validateRegisterFormData = () => {
    const validation = validateRegisterForm(registerForm as RegisterFormData);
    setFormErrors(validation.errors);
    return validation.isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginFormData()) {
      return;
    }

    dispatch(loginStart());
    
    try {
      const response = await api.post('/auth/login', {
        email: loginForm.email,
        password: loginForm.password
      });

      if (response.data.success) {
        dispatch(loginSuccess({
          user: response.data.user,
          token: response.data.token
        }));
        
        // Store refresh token if provided
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
      } else {
        dispatch(loginFailure(response.data.message || 'Login failed'));
      }
    } catch (error: any) {
      dispatch(loginFailure(
        error.response?.data?.message || 'Login failed. Please try again.'
      ));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegisterFormData()) {
      return;
    }

    dispatch(loginStart());
    
    try {
      const registerData: any = {
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password
      };

      // Add language and level if selected
      if (registerForm.language) {
        registerData.language = registerForm.language;
      }
      if (registerForm.currentLevel) {
        registerData.currentLevel = registerForm.currentLevel;
      }

      const response = await api.post('/auth/register', registerData);

      if (response.data.success) {
        dispatch(loginSuccess({
          user: response.data.user,
          token: response.data.token
        }));
        
        // Store refresh token if provided
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
      } else {
        dispatch(loginFailure(response.data.message || 'Registration failed'));
      }
    } catch (error: any) {
      dispatch(loginFailure(
        error.response?.data?.message || 'Registration failed. Please try again.'
      ));
    }
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
    });
    
    // Clear field error when user starts typing
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: ''
      });
    }
  };

  const handleRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value
    });
    
    // Clear field error when user starts typing
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: ''
      });
    }
  };

  const handleSelectChange = (field: string) => (e: any) => {
    setRegisterForm({
      ...registerForm,
      [field]: e.target.value
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 2
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: isMobile ? 3 : 4,
          maxWidth: 450,
          width: '100%',
          mx: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 1 }}>
          AI Language Learning
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Learn languages with AI-powered personalized lessons
        </Typography>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          centered
          sx={{ mb: 2 }}
        >
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={loginForm.email}
              onChange={handleLoginInputChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={loginForm.password}
              onChange={handleLoginInputChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              margin="normal"
              required
            />
            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              loading={loading}
            >
              Login
            </LoadingButton>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box component="form" onSubmit={handleRegister}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={registerForm.username}
              onChange={handleRegisterInputChange}
              error={!!formErrors.username}
              helperText={formErrors.username}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={registerForm.email}
              onChange={handleRegisterInputChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={registerForm.password}
              onChange={handleRegisterInputChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              margin="normal"
              required
            />
            <PasswordStrengthIndicator password={registerForm.password} />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={registerForm.confirmPassword}
              onChange={handleRegisterInputChange}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
              margin="normal"
              required
            />
            
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Learning Language (Optional)</InputLabel>
                <Select
                  value={registerForm.language}
                  label="Learning Language (Optional)"
                  onChange={handleSelectChange('language')}
                >
                  <MenuItem value="">
                    <em>Select later</em>
                  </MenuItem>
                  <MenuItem value="en">🇺🇸 English</MenuItem>
                  <MenuItem value="ja">🇯🇵 Japanese</MenuItem>
                  <MenuItem value="fr">🇫🇷 French</MenuItem>
                </Select>
                <FormHelperText>
                  You can add more languages after registration
                </FormHelperText>
              </FormControl>

              {registerForm.language && (
                <FormControl fullWidth>
                  <InputLabel>Current Level</InputLabel>
                  <Select
                    value={registerForm.currentLevel}
                    label="Current Level"
                    onChange={handleSelectChange('currentLevel')}
                  >
                    <MenuItem value="A1">A1 - Beginner</MenuItem>
                    <MenuItem value="A2">A2 - Elementary</MenuItem>
                    <MenuItem value="B1">B1 - Intermediate</MenuItem>
                    <MenuItem value="B2">B2 - Upper Intermediate</MenuItem>
                    <MenuItem value="C1">C1 - Advanced</MenuItem>
                    <MenuItem value="C2">C2 - Proficient</MenuItem>
                  </Select>
                  <FormHelperText>
                    Don't worry, we'll help assess your actual level
                  </FormHelperText>
                </FormControl>
              )}
            </Box>

            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              loading={loading}
            >
              Create Account
            </LoadingButton>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AuthPage;