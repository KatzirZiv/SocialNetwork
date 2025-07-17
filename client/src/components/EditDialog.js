import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, CircularProgress } from "@mui/material";

const EditDialog = ({ open, title, value, onChange, onClose, onSave, saveText = "Save", cancelText = "Cancel", loading = false }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        margin="dense"
        label="Content"
        type="text"
        fullWidth
        multiline
        minRows={2}
        value={value}
        onChange={onChange}
        disabled={loading}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>{cancelText}</Button>
      <Button onClick={onSave} variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={20} /> : saveText}
      </Button>
    </DialogActions>
  </Dialog>
);

export default EditDialog; 