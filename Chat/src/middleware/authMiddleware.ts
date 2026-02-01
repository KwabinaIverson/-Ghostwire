import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if ((req as any).cookies && (req as any).cookies.token) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const secret = process.env.JWT_SECRET || "default_secret";
    // Verify token
    const decoded = jwt.verify(token, secret);
    
    // Attach user data to request object
    (req as any).user = decoded; 
    
    next(); // Pass control to the controller
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};