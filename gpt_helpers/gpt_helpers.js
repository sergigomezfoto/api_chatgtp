
const manageContext = (messages, userMessage, maxContextSize =10) => {
  messages.push({ role: "user", content: userMessage });
  while (messages.length > maxContextSize + 3) {
    messages.splice(3, 1);
  }
  return messages; 
};

module.exports = { manageContext };
