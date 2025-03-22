const request = require("supertest");
const app = require("../server");
const { sequelize, Contact } = require("../models");

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await Contact.destroy({ where: {}, force: true });
});

describe("POST /identify endpoint", () => {
  test("Should create a new primary contact when no matches exist", async () => {
    const response = await request(app).post("/identify").send({
      email: "doc@example.com",
      phoneNumber: "1234567890",
    });

    expect(response.status).toBe(200);
    expect(response.body.contact).toBeDefined();
    expect(response.body.contact.primaryContactId).toBeDefined();
    expect(response.body.contact.emails).toContain("doc@example.com");
    expect(response.body.contact.phoneNumbers).toContain("1234567890");
    expect(response.body.contact.secondaryContactIds).toEqual([]);

    const contacts = await Contact.findAll();
    expect(contacts.length).toBe(1);
    expect(contacts[0].linkPrecedence).toBe("primary");
  });

  test("Should link new contact when email matches an existing contact", async () => {
    await Contact.create({
      email: "doc@example.com",
      phoneNumber: "1234567890",
      linkPrecedence: "primary",
    });

    const response = await request(app).post("/identify").send({
      email: "doc@example.com",
      phoneNumber: "9876543210",
    });

    expect(response.status).toBe(200);
    expect(response.body.contact.emails).toContain("doc@example.com");
    expect(response.body.contact.phoneNumbers).toContain("1234567890");
    expect(response.body.contact.phoneNumbers).toContain("9876543210");
    expect(response.body.contact.secondaryContactIds.length).toBe(1);

    const contacts = await Contact.findAll();
    expect(contacts.length).toBe(2);
    expect(contacts.filter((c) => c.linkPrecedence === "primary").length).toBe(
      1
    );
    expect(
      contacts.filter((c) => c.linkPrecedence === "secondary").length
    ).toBe(1);
  });

  test("Should link new contact when phone matches an existing contact", async () => {
    await Contact.create({
      email: "doc@example.com",
      phoneNumber: "1234567890",
      linkPrecedence: "primary",
    });

    const response = await request(app).post("/identify").send({
      email: "doc2@example.com",
      phoneNumber: "1234567890",
    });

    expect(response.status).toBe(200);
    expect(response.body.contact.emails).toContain("doc@example.com");
    expect(response.body.contact.emails).toContain("doc2@example.com");
    expect(response.body.contact.phoneNumbers).toContain("1234567890");
    expect(response.body.contact.secondaryContactIds.length).toBe(1);
  });

  test("Should handle complex linking scenarios", async () => {
    const contact1 = await Contact.create({
      email: "doc@example.com",
      phoneNumber: "1234567890",
      linkPrecedence: "primary",
    });

    const contact2 = await Contact.create({
      email: "doc2@example.com",
      phoneNumber: "9876543210",
      linkPrecedence: "primary",
    });

    const response = await request(app).post("/identify").send({
      email: "doc@example.com",
      phoneNumber: "9876543210",
    });

    expect(response.status).toBe(200);

    const primaryId =
      contact1.createdAt < contact2.createdAt ? contact1.id : contact2.id;

    expect(response.body.contact.primaryContactId).toBe(primaryId);
    expect(response.body.contact.emails).toContain("doc@example.com");
    expect(response.body.contact.emails).toContain("doc2@example.com");
    expect(response.body.contact.phoneNumbers).toContain("1234567890");
    expect(response.body.contact.phoneNumbers).toContain("9876543210");

    const updatedContact1 = await Contact.findByPk(contact1.id);
    const updatedContact2 = await Contact.findByPk(contact2.id);

    if (contact1.createdAt < contact2.createdAt) {
      expect(updatedContact1.linkPrecedence).toBe("primary");
      expect(updatedContact2.linkPrecedence).toBe("secondary");
      expect(updatedContact2.linkedId).toBe(contact1.id);
    } else {
      expect(updatedContact1.linkPrecedence).toBe("secondary");
      expect(updatedContact2.linkPrecedence).toBe("primary");
      expect(updatedContact1.linkedId).toBe(contact2.id);
    }
  });

  test("Should return 400 when neither email nor phone is provided", async () => {
    const response = await request(app).post("/identify").send({});

    expect(response.status).toBe(400);
  });
});
