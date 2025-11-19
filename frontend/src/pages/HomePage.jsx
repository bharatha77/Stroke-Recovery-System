import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../assets/homeimg.png';

function HomePage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
        color: '#fff',
      }}
    >
      {/* Left Column - Text Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          px: { xs: 3, md: 10 },
          py: { xs: 6, md: 0 },
          background:
            'linear-gradient(135deg, rgba(106,17,203,0.9) 0%, rgba(37,117,252,0.9) 100%)',
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ lineHeight: 1.1 }}>
          Empower Your Stroke Recovery Journey
        </Typography>
        <Typography
          variant="h6"
          sx={{ mb: 4, fontWeight: 400, opacity: 0.85, maxWidth: 600 }}
        >
          Utilize cutting-edge computer interaction and AI-driven insights to track and accelerate your rehabilitation progress with confidence.
        </Typography>
        <Button
  variant="contained"
  size="large"
  sx={{ bgcolor: "#ff6f61", "&:hover": { bgcolor: "#e65a50" } }}
  onClick={() => navigate("/login")}
>
  Get Started
</Button>

      </Box>

      {/* Right Column - Image */}
      <Box
        sx={{
          flex: 1,
backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          minHeight: { xs: 300, md: '100vh' },
          borderTopLeftRadius: { xs: 0, md: '80px' },
          borderBottomLeftRadius: { xs: 0, md: '80px' },
          boxShadow: 'inset 0 0 40px rgba(106,17,203,0.7)',
        }}
      />
    </Box>
  );
}

export default HomePage;
