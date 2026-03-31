import { AuthService } from "../AuthServices";
import { db } from "../../lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { EmailService } from "../emailService";

// Mock dependencies
jest.mock("../../lib/db", () => ({
  db: {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    professor: {
      create: jest.fn(),
    },
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock("../emailService", () => ({
  EmailService: {
    sendResetPasswordEmail: jest.fn(),
  },
}));

describe("AuthService", () => {
  const userId = "user-123";
  const email = "test@example.com";
  const password = "password123";

  beforeEach(() => {
    process.env.JWT_SECRET = "secret";
    process.env.JWT_REFRESH_SECRET = "refresh-secret";
    jest.clearAllMocks();
  });

  describe("generateTokens", () => {
    it("should generate access and refresh tokens and save refresh token to db", async () => {
      (jwt.sign as jest.Mock).mockReturnValueOnce("access-token").mockReturnValueOnce("refresh-token");

      const tokens = await AuthService.generateTokens(userId);

      expect(tokens).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
      expect(db.refreshToken.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          token: "refresh-token",
          userId,
        }),
      }));
    });
  });

  describe("login", () => {
    it("should return user and tokens if credentials are valid", async () => {
      const mockUser = {
        id: userId,
        email,
        passwordHash: "hashed-pw",
        name: "Test User",
        role: "STUDENT",
      };
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("token");

      const result = await AuthService.login(email, password);

      expect(result.user.id).toBe(userId);
      expect(result.tokens).toBeDefined();
    });

    it("should throw UnauthorizedError if user not found", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.login(email, password)).rejects.toThrow();
    });
  });

  describe("register", () => {
    it("should hash password and create user", async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-pw");
      (db.user.create as jest.Mock).mockResolvedValue({ id: userId, email, role: "STUDENT" });

      const user = await AuthService.register(email, "Name", password);

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(db.user.create).toHaveBeenCalled();
      expect(user.id).toBe(userId);
    });

    it("should create professor record if role is PROFESSOR", async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-pw");
      (db.user.create as jest.Mock).mockResolvedValue({ id: userId, email, role: "PROFESSOR" });

      await AuthService.register(email, "Name", password, "PROFESSOR");

      expect(db.professor.create).toHaveBeenCalledWith({ data: { userId } });
    });
  });

  describe("forgotPassword", () => {
    it("should generate a reset token and send email", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: userId, email });

      await AuthService.forgotPassword(email);

      expect(db.user.update).toHaveBeenCalled();
      expect(EmailService.sendResetPasswordEmail).toHaveBeenCalled();
    });
  });
});
