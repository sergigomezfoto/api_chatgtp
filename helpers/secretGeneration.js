// Importem el mòdul de criptografia de Node.js
const crypto = require("crypto");

// Funció per generar un secret aleatori
const generateSecret = (length = 64) => {
  // Utilitzem la funció randomBytes del mòdul crypto per generar un nombre aleatori de bytes
  const randomBytes = crypto.randomBytes(length);

  // Convertim els bytes aleatoris a una cadena hexadecimal
  const secret = randomBytes.toString("hex");

  // Retornem el secret generat
  return secret;
};

// Exportem la funció generateSecret perquè pugui ser utilitzada en altres parts del nostre codi
module.exports = { generateSecret };