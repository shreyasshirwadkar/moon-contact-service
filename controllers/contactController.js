const {
  findExistingContacts,
  processContacts,
} = require("../services/contactService");
async function identifyContact(req, res) {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "At least one of email or phoneNumber must be provided",
      });
    }

    const existingContacts = await findExistingContacts(email, phoneNumber);

    const result = await processContacts(existingContacts, email, phoneNumber);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing identify request:", error);
    return res.status(500).json({
      error: "An internal error occurred while processing your request",
    });
  }
}
module.exports = { identifyContact };
