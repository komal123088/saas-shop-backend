import {  PORT } from "./env";

PORT
function setupEnvironment() {
  const envPath = path.join(__dirname, ".env");

  if (fs.existsSync(envPath)) {
    console.log("✅ Already configured");
    return;
  }

  // Generate random JWT_SECRET
  const jwtSecret = crypto.randomBytes(64).toString("hex");

  const envContent = `PORT= ${PORT}
MONGO_URI=${process.env.MONGO_URI}
JWT_SECRET=${jwtSecret}
`;

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Configuration created!");
}
