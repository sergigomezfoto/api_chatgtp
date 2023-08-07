// Funció per gestionar el context dels missatges en una conversa
const manageContext = (messages, userMessage, maxContextSize = 10) => {
  // Afegim el missatge de l'usuari al final de la llista de missatges
  messages.push({ role: "user", content: userMessage });

  // Comprovem si la llista de missatges ha superat la mida màxima de context, i si és així, en retirem missatges antics per mantenir la mida desitjada
  while (messages.length > maxContextSize + 3) {
    // Eliminem el quart missatge (índex 3) de la llista de missatges
    messages.splice(3, 1);
  }

  // Retornem la llista de missatges actualitzada
  return messages;
};

// Exportem la funció manageContext perquè pugui ser utilitzada en altres parts del nostre codi
module.exports = { manageContext };