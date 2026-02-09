import bcrypt from "bcrypt";

const password = "Ayesha@1998"; // apna password yahan likho
const saltRounds = 10;

async function hashPassword() {
  try {
    const hashed = await bcrypt.hash(password, saltRounds);
    console.log("Original Password:", password);
    console.log("Hashed Password:", hashed);
  } catch (error) {
    console.log("Error:", error);
  }
}

hashPassword();
