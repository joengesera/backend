import { authenticateToken } from "../auth.middleware";
import jwt from "jsonwebtoken";

// Mock jwt
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

describe("authenticateToken", () => {
  let mockReq: any;
  let mockRes: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    process.env.JWT_SECRET = "test-secret";
    jest.clearAllMocks();
  });

  it("should set user id on request if token is valid", () => {
    mockReq.headers.authorization = "Bearer valid-token";
    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(null, { userId: "user-123" });
    });

    authenticateToken(mockReq, mockRes, next);

    expect(mockReq.user).toEqual({ userId: "user-123" });
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if no authorization header is present", () => {
    authenticateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if token is invalid", () => {
    mockReq.headers.authorization = "Bearer invalid-token";
    (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
      callback(new Error("Invalid token"), null);
    });

    authenticateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
