module.exports = {
  apps: [
    {
      name: "primetech-backend",
      cwd: "/opt/prime-tech-backend",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "4000"
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      time: true
    },
    {
      name: "primetech-frontend",
      cwd: "/opt/prime-tech-frontend",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      time: true
    }
  ]
};
