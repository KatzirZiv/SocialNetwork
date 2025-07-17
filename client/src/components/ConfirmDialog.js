import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress } from "@mui/material";

const ConfirmDialog = ({ open, title, content, onClose, onConfirm, confirmText = "Confirm", cancelText = "Cancel", loading = false }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography>{content}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>{cancelText}</Button>
      <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={20} /> : confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog; 