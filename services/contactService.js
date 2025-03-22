const { Contact } = require("../models");
const { Sequelize } = require("sequelize");
/**
 * Find all existing contacts based on email or phone number
 * @param {string} email - Email to search for
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<Array>} - Array of contacts found
 */
async function findExistingContacts(email, phoneNumber) {
  const whereConditions = [];

  if (email) {
    whereConditions.push({ email });
  }

  if (phoneNumber) {
    whereConditions.push({ phoneNumber });
  }

  const contacts = await Contact.findAll({
    where: {
      [Sequelize.Op.or]: whereConditions,
      deletedAt: null,
    },
  });

  if (contacts.length > 0) {
    const contactIds = new Set();
    const linkedIds = new Set();

    contacts.forEach((contact) => {
      contactIds.add(contact.id);
      if (contact.linkedId) {
        linkedIds.add(contact.linkedId);
      }
    });

    const primaryContacts = await Contact.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: Array.from(linkedIds),
        },
        linkPrecedence: "primary",
        deletedAt: null,
      },
    });

    primaryContacts.forEach((contact) => {
      contactIds.add(contact.id);
    });

    const secondaryContacts = await Contact.findAll({
      where: {
        linkedId: {
          [Sequelize.Op.in]: Array.from(contactIds),
        },
        linkPrecedence: "secondary",
        deletedAt: null,
      },
    });

    return [...contacts, ...primaryContacts, ...secondaryContacts].filter(
      (contact, index, self) =>
        index === self.findIndex((c) => c.id === contact.id)
    );
  }

  return contacts;
}

/**
 * Process contacts to determine the primary contact and create/update records as needed
 * @param {Array} existingContacts - Array of existing contacts
 * @param {string} email - Email from the request
 * @param {string} phoneNumber - Phone number from the request
 * @returns {Object} - Consolidated contact information
 */
async function processContacts(existingContacts, email, phoneNumber) {
  if (existingContacts.length === 0) {
    const newContact = await Contact.create({
      email,
      phoneNumber,
      linkPrecedence: "primary",
    });

    return formatResponse(newContact);
  }

  let primaryContact = existingContacts.find(
    (contact) => contact.linkPrecedence === "primary"
  );

  if (!primaryContact) {
    const oldestContact = existingContacts.reduce((oldest, current) => {
      return oldest.createdAt < current.createdAt ? oldest : current;
    });

    await Contact.update(
      { linkPrecedence: "primary", linkedId: null },
      { where: { id: oldestContact.id } }
    );

    for (const contact of existingContacts) {
      if (contact.id !== oldestContact.id) {
        await Contact.update(
          { linkPrecedence: "secondary", linkedId: oldestContact.id },
          { where: { id: contact.id } }
        );
      }
    }

    return await handleContactAfterUpdate(oldestContact.id, email, phoneNumber);
  }

  const existingEmail = existingContacts.some(
    (contact) => contact.email === email
  );
  const existingPhone = existingContacts.some(
    (contact) => contact.phoneNumber === phoneNumber
  );

  if (email && phoneNumber && !existingEmail && !existingPhone) {
    await Contact.create({
      email,
      phoneNumber,
      linkedId: primaryContact.id,
      linkPrecedence: "secondary",
    });
  } else if (email && !existingEmail) {
    await Contact.create({
      email,
      linkedId: primaryContact.id,
      linkPrecedence: "secondary",
    });
  } else if (phoneNumber && !existingPhone) {
    await Contact.create({
      phoneNumber,
      linkedId: primaryContact.id,
      linkPrecedence: "secondary",
    });
  }

  return await handleContactAfterUpdate(primaryContact.id, email, phoneNumber);
}

/**
 * Handle contact information after an update
 * @param {number} primaryId - ID of the primary contact
 * @param {string} email - Email from the request
 * @param {string} phoneNumber - Phone number from the request
 * @returns {Object} - Consolidated contact information
 */
async function handleContactAfterUpdate(primaryId, email, phoneNumber) {
  const primaryContact = await Contact.findByPk(primaryId);

  const secondaryContacts = await Contact.findAll({
    where: {
      linkedId: primaryId,
      linkPrecedence: "secondary",
      deletedAt: null,
    },
  });

  return formatResponse(primaryContact, secondaryContacts);
}

/**
 * Format the response for the API
 * @param {Object} primaryContact - Primary contact object
 * @param {Array} secondaryContacts - Array of secondary contacts (optional)
 * @returns {Object} - Formatted response object
 */
function formatResponse(primaryContact, secondaryContacts = []) {
  const emails = new Set();
  const phoneNumbers = new Set();
  const secondaryContactIds = [];

  if (primaryContact.email) emails.add(primaryContact.email);
  if (primaryContact.phoneNumber) phoneNumbers.add(primaryContact.phoneNumber);

  secondaryContacts.forEach((contact) => {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    secondaryContactIds.push(contact.id);
  });

  return {
    contact: {
      primaryContactId: primaryContact.id,
      emails: Array.from(emails),
      phoneNumbers: Array.from(phoneNumbers),
      secondaryContactIds,
    },
  };
}
module.exports = { findExistingContacts, processContacts };
