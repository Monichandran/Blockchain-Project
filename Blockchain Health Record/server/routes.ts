import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertUserSchema, insertAccessSchema } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import { UPLOADS_PATH, config } from "./env";

// Session augmentation - Must be at top level
declare module 'express-session' {
  interface SessionData {
    user?: {
      address: string;
      role: "patient" | "doctor";
    };
  }
}

// Configure multer for file uploads using environment path
const uploadsDir = UPLOADS_PATH;
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    cb(null, uploadsDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage_config,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
    const allowedTypes = [".pdf", ".png", ".jpg", ".jpeg", ".gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, PNG, JPG, and GIF files are allowed"));
    }
  },
});

// Set up session store
const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(
    session({
      store: new SessionStore({ checkPeriod: 86400000 }), // Prune expired entries every 24h
      secret: config.SESSION_SECRET, // Using configured secret from environment
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.IS_PRODUCTION, // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Session is augmented through the declaration at the top of the file

  // ===== Auth Routes =====
  
  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { address, role } = req.body;
      
      if (!address || !role) {
        return res.status(400).json({ message: "Address and role are required" });
      }
      
      if (role !== "patient" && role !== "doctor") {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Store user info in session
      req.session.user = { address, role };
      
      res.status(200).json({ message: "Login successful" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logout successful" });
    });
  });
  
  // Check authentication status
  app.get("/api/auth/check", (req: Request, res: Response) => {
    if (req.session.user) {
      res.status(200).json({
        authenticated: true,
        address: req.session.user.address,
        role: req.session.user.role,
      });
    } else {
      res.status(200).json({ authenticated: false });
    }
  });
  
  // Auth middleware
  const authenticate = (req: Request, res: Response, next: Function) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // ===== User Routes =====
  
  // Check if user exists
  app.get("/api/users/check/:address", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const user = await storage.getUserByAddress(address);
      
      if (user) {
        res.status(200).json({ exists: true, role: user.role });
      } else {
        res.status(200).json({ exists: false });
      }
    } catch (error) {
      console.error("Error checking user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create user
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByAddress(validatedData.address);
      
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }
      
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // ===== Medical Record Routes =====
  
  // Upload medical record
  app.post("/api/records", authenticate, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { title, recordType, recordDate, patientAddress } = req.body;
      
      if (!title || !recordType || !recordDate || !patientAddress) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if authenticated user is the patient or validate patient permission
      if (req.session.user!.role === "patient" && 
          req.session.user!.address.toLowerCase() !== patientAddress.toLowerCase()) {
        return res.status(403).json({ message: "You can only upload records for yourself" });
      }
      
      const record = await storage.createMedicalRecord({
        title,
        recordType,
        recordDate,
        patientAddress,
        filePath: req.file.path,
      });
      
      res.status(201).json(record);
    } catch (error) {
      console.error("Error uploading record:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  // Get records for a patient
  app.get("/api/records", authenticate, async (req: Request, res: Response) => {
    try {
      const { patientAddress } = req.query;
      
      if (!patientAddress || typeof patientAddress !== "string") {
        return res.status(400).json({ message: "Patient address is required" });
      }
      
      // Verify permission - either the user is the patient or a doctor with access
      if (req.session.user!.role === "patient") {
        if (req.session.user!.address.toLowerCase() !== patientAddress.toLowerCase()) {
          return res.status(403).json({ message: "You can only view your own records" });
        }
      } else if (req.session.user!.role === "doctor") {
        // Check if doctor has access to this patient's records
        const accessList = await storage.getAccessByDoctor(req.session.user!.address);
        const hasAccess = accessList.some(
          access => access.patientAddress.toLowerCase() === patientAddress.toLowerCase()
        );
        
        if (!hasAccess) {
          return res.status(403).json({ message: "You don't have access to this patient's records" });
        }
      }
      
      const records = await storage.getMedicalRecordsByPatient(patientAddress);
      res.status(200).json(records);
    } catch (error) {
      console.error("Error fetching records:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // View record
  app.get("/api/records/view/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }
      
      const record = await storage.getMedicalRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      // Check if user has permission to view
      if (req.session.user!.role === "patient") {
        if (req.session.user!.address.toLowerCase() !== record.patientAddress.toLowerCase()) {
          return res.status(403).json({ message: "You can only view your own records" });
        }
      } else if (req.session.user!.role === "doctor") {
        // Check if doctor has access to this record
        const accessList = await storage.getAccessByDoctor(req.session.user!.address);
        const hasAccess = accessList.some(
          access => 
            access.patientAddress.toLowerCase() === record.patientAddress.toLowerCase() &&
            access.recordIds.includes(record.id)
        );
        
        if (!hasAccess) {
          return res.status(403).json({ message: "You don't have access to this record" });
        }
      }
      
      // Serve the file
      if (!fs.existsSync(record.filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.sendFile(path.resolve(record.filePath));
    } catch (error) {
      console.error("Error viewing record:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Download record
  app.get("/api/records/download/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }
      
      const record = await storage.getMedicalRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      // Check if user has permission to download
      if (req.session.user!.role === "patient") {
        if (req.session.user!.address.toLowerCase() !== record.patientAddress.toLowerCase()) {
          return res.status(403).json({ message: "You can only download your own records" });
        }
      } else if (req.session.user!.role === "doctor") {
        // Check if doctor has access to this record
        const accessList = await storage.getAccessByDoctor(req.session.user!.address);
        const hasAccess = accessList.some(
          access => 
            access.patientAddress.toLowerCase() === record.patientAddress.toLowerCase() &&
            access.recordIds.includes(record.id)
        );
        
        if (!hasAccess) {
          return res.status(403).json({ message: "You don't have access to this record" });
        }
      }
      
      // Serve the file as download
      if (!fs.existsSync(record.filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const fileName = path.basename(record.filePath);
      res.download(record.filePath, `${record.title}${path.extname(fileName)}`);
    } catch (error) {
      console.error("Error downloading record:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete record
  app.delete("/api/records/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ message: "Invalid record ID" });
      }
      
      const record = await storage.getMedicalRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      // Check if user has permission to delete
      if (req.session.user!.role === "patient") {
        // Patients can only delete their own records
        if (req.session.user!.address.toLowerCase() !== record.patientAddress.toLowerCase()) {
          return res.status(403).json({ message: "You can only delete your own records" });
        }
      } else if (req.session.user!.role === "doctor") {
        // Doctors need to have access to the record to delete it
        const accessList = await storage.getAccessByDoctor(req.session.user!.address);
        const hasAccess = accessList.some(
          access => 
            access.patientAddress.toLowerCase() === record.patientAddress.toLowerCase() &&
            access.recordIds.includes(record.id)
        );
        
        if (!hasAccess) {
          return res.status(403).json({ message: "You don't have access to delete this record" });
        }
      }
      
      // Delete the record
      const success = await storage.deleteMedicalRecord(recordId);
      
      if (success) {
        res.status(200).json({ message: "Record deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete record" });
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== Access Permission Routes =====
  
  // Grant access to a doctor
  app.post("/api/access", authenticate, async (req: Request, res: Response) => {
    try {
      // Validate user is a patient
      if (req.session.user!.role !== "patient") {
        return res.status(403).json({ message: "Only patients can grant access" });
      }
      
      const { doctorAddress, recordIds, accessDuration, patientAddress } = req.body;
      
      // Verify the patient address matches the authenticated user
      if (req.session.user!.address.toLowerCase() !== patientAddress.toLowerCase()) {
        return res.status(403).json({ message: "You can only grant access to your own records" });
      }
      
      // Validate data
      const accessData = insertAccessSchema.parse({
        patientAddress,
        doctorAddress,
        recordIds,
        duration: accessDuration,
      });
      
      // Verify all records belong to the patient
      const patientRecords = await storage.getMedicalRecordsByPatient(patientAddress);
      const patientRecordIds = patientRecords.map(record => record.id);
      
      const invalidRecords = recordIds.filter((id: number) => !patientRecordIds.includes(id));
      if (invalidRecords.length > 0) {
        return res.status(400).json({ 
          message: "Some records don't belong to you",
          invalidRecords
        });
      }
      
      // Create access
      const access = await storage.createAccess(accessData);
      res.status(201).json(access);
    } catch (error) {
      console.error("Error granting access:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  // Get all access permissions for a patient
  app.get("/api/access", authenticate, async (req: Request, res: Response) => {
    try {
      const { patientAddress } = req.query;
      
      if (!patientAddress || typeof patientAddress !== "string") {
        return res.status(400).json({ message: "Patient address is required" });
      }
      
      // Verify the patient address matches the authenticated user
      if (req.session.user!.role === "patient" && 
          req.session.user!.address.toLowerCase() !== patientAddress.toLowerCase()) {
        return res.status(403).json({ message: "You can only view your own access permissions" });
      }
      
      const accessList = await storage.getAccessByPatient(patientAddress);
      res.status(200).json(accessList);
    } catch (error) {
      console.error("Error fetching access permissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get accessible records for a doctor
  app.get("/api/access/doctor", authenticate, async (req: Request, res: Response) => {
    try {
      const { doctorAddress } = req.query;
      
      if (!doctorAddress || typeof doctorAddress !== "string") {
        return res.status(400).json({ message: "Doctor address is required" });
      }
      
      // Verify the doctor address matches the authenticated user
      if (req.session.user!.role === "doctor" && 
          req.session.user!.address.toLowerCase() !== doctorAddress.toLowerCase()) {
        return res.status(403).json({ message: "You can only view your own accessible records" });
      }
      
      const accessibleRecords = await storage.getAccessibleRecordsByDoctor(doctorAddress);
      res.status(200).json(accessibleRecords);
    } catch (error) {
      console.error("Error fetching accessible records:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Revoke access
  app.delete("/api/access/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const accessId = parseInt(req.params.id);
      if (isNaN(accessId)) {
        return res.status(400).json({ message: "Invalid access ID" });
      }
      
      const access = await storage.getAccess(accessId);
      if (!access) {
        return res.status(404).json({ message: "Access permission not found" });
      }
      
      // Verify the patient address matches the authenticated user
      if (req.session.user!.role === "patient" && 
          req.session.user!.address.toLowerCase() !== access.patientAddress.toLowerCase()) {
        return res.status(403).json({ message: "You can only revoke your own access permissions" });
      }
      
      const success = await storage.revokeAccess(accessId);
      if (success) {
        res.status(200).json({ message: "Access revoked successfully" });
      } else {
        res.status(500).json({ message: "Failed to revoke access" });
      }
    } catch (error) {
      console.error("Error revoking access:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
