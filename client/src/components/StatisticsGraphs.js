import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Avatar,
  Stack,
} from "@mui/material";
import axios from "axios";
import $ from "jquery";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import * as d3 from "d3";
import { Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function useStatsData() {
  const [posts, setPosts] = useState(null);
  const [users, setUsers] = useState(null);
  const [topUsers, setTopUsers] = useState(null);
  const [byDay, setByDay] = useState(null);
  const [byHour, setByHour] = useState(null);
  const [topGroups, setTopGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const postsPromise = new Promise((resolve, reject) => {
      $.ajax({
        url: `${API_URL}/posts/stats/new-per-month`,
        method: "GET",
        headers,
        success: (data) => resolve({ data }),
        error: (jqXHR, textStatus, errorThrown) =>
          reject(errorThrown || textStatus),
      });
    });
    Promise.all([
      postsPromise,
      axios.get(`${API_URL}/users/stats/new-per-month`, { headers }),
      axios.get(`${API_URL}/posts/stats/top-users`, { headers }),
      axios.get(`${API_URL}/posts/stats/by-day-of-week`, { headers }),
      axios.get(`${API_URL}/posts/stats/by-hour`, { headers }),
      axios.get(`${API_URL}/groups/stats/top-groups`, { headers }),
    ])
      .then(
        ([
          postsRes,
          usersRes,
          topUsersRes,
          byDayRes,
          byHourRes,
          topGroupsRes,
        ]) => {
          const postsData = postsRes.data.data;
          const usersData = usersRes.data.data;
          const postsMax = d3.max(postsData, (d) => d.count);
          const postsMin = d3.min(postsData, (d) => d.count);
          const postsAvg = d3.mean(postsData, (d) => d.count);
          const usersMax = d3.max(usersData, (d) => d.count);
          const usersMin = d3.min(usersData, (d) => d.count);
          const usersAvg = d3.mean(usersData, (d) => d.count);
          postsData.stats = { max: postsMax, min: postsMin, avg: postsAvg };
          usersData.stats = { max: usersMax, min: usersMin, avg: usersAvg };
          setPosts(postsData);
          setUsers(usersData);
          setTopUsers(topUsersRes.data.data);
          setByDay(byDayRes.data.data);
          setByHour(byHourRes.data.data);
          setTopGroups(topGroupsRes.data.data);
          setError(null);
        }
      )
      .catch((err) => {
        setError("Failed to load statistics");
      })
      .finally(() => setLoading(false));
  }, []);

  return { posts, users, topUsers, byDay, byHour, topGroups, loading, error };
}

function PostsBarChart({ data }) {
  return (
    <Box sx={{ width: "100%", height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            fontSize={11}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Bar dataKey="count" fill="#ffb6d5" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <Typography
        align="center"
        fontWeight={700}
        fontSize={15}
        color="#dc004e"
        mt={1}
      >
        New Posts Per Month
      </Typography>
    </Box>
  );
}

function UsersLineChart({ data }) {
  return (
    <Box sx={{ width: "100%", height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            fontSize={11}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#1976d2"
            strokeWidth={3}
            dot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <Typography
        align="center"
        fontWeight={700}
        fontSize={15}
        color="#1976d2"
        mt={1}
      >
        New Users Per Month
      </Typography>
    </Box>
  );
}

function getProfilePictureUrl(profilePicture) {
  if (!profilePicture) return "/default-profile.png";
  if (profilePicture.startsWith("/uploads"))
    return `http://localhost:5000${profilePicture}`;
  return "/default-profile.png";
}

function TopUsersChart({ data, compact }) {
  if (!data) return null;
  return (
    <Box sx={{ width: "100%", height: compact ? 160 : 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={
            compact
              ? { top: 10, right: 10, left: 30, bottom: 10 }
              : { top: 20, right: 20, left: 40, bottom: 20 }
          }
          barSize={compact ? 18 : 28}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            allowDecimals={false}
            fontSize={compact ? 11 : 12}
          />
          <YAxis
            dataKey="username"
            type="category"
            fontSize={compact ? 11 : 13}
            width={compact ? 70 : 100}
            tick={({ x, y, payload }) => {
              const user = data.find((u) => u.username === payload.value);
              const img = getProfilePictureUrl(user?.profilePicture);
              return (
                <g
                  transform={`translate(${x - (compact ? 18 : 30)},${
                    y + (compact ? 8 : 10)
                  })`}
                >
                  <foreignObject width="24" height="24">
                    <Avatar
                      src={img}
                      sx={{
                        width: 20,
                        height: 20,
                        mr: 1,
                        display: "inline-block",
                        verticalAlign: "middle",
                      }}
                    />
                  </foreignObject>
                  <text
                    x={compact ? 26 : 35}
                    y={0}
                    dy={0}
                    fontSize={compact ? 11 : 13}
                    fill="#222"
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />
          <Tooltip />
          <Bar dataKey="count" fill="#ffb6d5" radius={6} />
        </BarChart>
      </ResponsiveContainer>
      <Typography
        align="center"
        fontWeight={700}
        fontSize={15}
        color="#dc004e"
        mt={1.5}
        mb={compact ? 0.5 : 2}
      >
        Top Active Users (by Posts)
      </Typography>
    </Box>
  );
}

function PostsByDayChart({ data }) {
  return (
    <Box sx={{ width: "100%", height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Bar dataKey="count" fill="#90caf9" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <Typography
        align="center"
        fontWeight={700}
        fontSize={15}
        color="#1976d2"
        mt={1}
      >
        Posts by Day of Week
      </Typography>
    </Box>
  );
}

function PostsByHourChart({ data }) {
  return (
    <Box sx={{ width: "100%", height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#ffb6d5"
            strokeWidth={3}
            dot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <Typography
        align="center"
        fontWeight={700}
        fontSize={15}
        color="#ffb6d5"
        mt={1}
      >
        Posts by Hour
      </Typography>
    </Box>
  );
}

export default function StatisticsGraphs({ compact }) {
  const { posts, users, topUsers, byDay, byHour, topGroups, loading, error } =
    useStatsData();
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontWeight: 700,
          color: "#222",
          textAlign: "center",
          cursor: "pointer",
          textDecoration: "underline",
        }}
        component={Link}
        to="/statistics"
      >
        Statistics
      </Typography>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            justifyContent: "center",
          }}
        >
          <PostsBarChart data={posts} />
          <UsersLineChart data={users} />
          <TopUsersChart data={topUsers} compact={compact} />
          <PostsByDayChart data={byDay} />
          <PostsByHourChart data={byHour} />
        </Box>
      )}
    </Paper>
  );
}
