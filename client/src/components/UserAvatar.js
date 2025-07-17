import React from "react";
import Avatar from "@mui/material/Avatar";

const UserAvatar = ({ user, size = 40, sx = {}, ...props }) => {
  const [src, setSrc] = React.useState(
    user?.profilePicture ? `http://localhost:5000${user.profilePicture}` : "/default-profile.png"
  );

  React.useEffect(() => {
    setSrc(user?.profilePicture ? `http://localhost:5000${user.profilePicture}` : "/default-profile.png");
  }, [user?.profilePicture]);

  return (
    <Avatar
      src={src}
      alt={user?.username || "User"}
      sx={{ width: size, height: size, ...sx }}
      onError={e => { setSrc("/default-profile.png"); }}
      {...props}
    >
      {user?.username ? user.username[0].toUpperCase() : "U"}
    </Avatar>
  );
};

export default UserAvatar; 