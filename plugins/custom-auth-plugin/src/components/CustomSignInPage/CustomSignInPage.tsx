/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useState } from 'react';
import {
  Typography,
  makeStyles,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  CircularProgress,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { configApiRef, useApi } from '@backstage/core-plugin-api';

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
  },
  card: {
    maxWidth: 600,
    width: '100%',
    margin: theme.spacing(2),
  },
  instructions: {
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  successMessage: {
    marginBottom: theme.spacing(2),
  },
}));

interface FormData {
  username: string;
  password: string;
}

export const CustomSignInPage = () => {
  const classes = useStyles();
  const config = useApi(configApiRef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
  });

  const handleInputChange =
    (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [field]: event.target.value }));
    };

  const handleCustomLogin = async () => {
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Direct authentication via Backstage auth provider
      const backendUrl = config.getString('backend.baseUrl');
      const authUrl = `${backendUrl}/api/auth/custom/start`;
      const params = new URLSearchParams({
        username: formData.username,
        password: formData.password,
      });

      setSuccess('Authenticating...');

      // Redirect directly to the auth provider endpoint
      setTimeout(() => {
        window.location.href = `${authUrl}?${params.toString()}`;
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <Container className={classes.container}>
      <Card className={classes.card}>
        <CardContent>
          <Typography variant="h5" className={classes.instructions}>
            Custom Authentication
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            className={classes.instructions}
          >
            Demonstration of custom authentication integration with Backstage.
            <br />
            <strong>Available credentials:</strong> test/test, admin/admin,
            user1/password1
          </Typography>

          {error && (
            <Alert severity="error" style={{ marginBottom: 16 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" className={classes.successMessage}>
              {success}
            </Alert>
          )}

          <div className={classes.form}>
            <Typography variant="h6">Custom Username/Password Login</Typography>
            <Typography variant="body2" color="textSecondary">
              Enter your credentials to authenticate with Backstage using the
              custom provider.
            </Typography>

            <FormControl fullWidth>
              <TextField
                label="Username"
                variant="outlined"
                value={formData.username}
                onChange={handleInputChange('username')}
                disabled={loading}
                placeholder="Enter username (e.g., test, admin, user1)"
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                value={formData.password}
                onChange={handleInputChange('password')}
                disabled={loading}
                placeholder="Enter password"
              />
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              onClick={handleCustomLogin}
              disabled={loading || !formData.username || !formData.password}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
};
