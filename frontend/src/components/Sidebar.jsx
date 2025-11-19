import React, { useState, useEffect } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import HistoryIcon from "@mui/icons-material/History";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import MouseIcon from "@mui/icons-material/Mouse";
import VideocamIcon from "@mui/icons-material/Videocam";
import AssessmentIcon from "@mui/icons-material/Assessment";

const drawerWidth = 240;

function Sidebar({ activeView, setActiveView }) {
  const [open, setOpen] = useState(true);
  const toggleDrawer = () => setOpen(!open);

  const menuItems = [
    { text: "Session History", icon: <HistoryIcon /> },
    { text: "Keystroke", icon: <KeyboardIcon /> },
    { text: "Mouse", icon: <MouseIcon /> },
    { text: "Webcam", icon: <VideocamIcon /> },
    { text: "Final Analysis", icon: <AssessmentIcon /> },
  ];

  useEffect(() => {
    if (!activeView) setActiveView("Session History");
  }, [activeView, setActiveView]);

  return (
    <Drawer
      variant="persistent"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
        }}
      >
        <Typography variant="h6" noWrap>
          Stroke App
        </Typography>
        <IconButton onClick={toggleDrawer}>
          <MenuIcon />
        </IconButton>
      </Toolbar>

      <Divider />

      <List>
        {menuItems.map(({ text, icon }) => (
          <ListItemButton
            key={text}
            selected={activeView === text}
            onClick={() => setActiveView(text)}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={text} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

export default Sidebar;
