import { 
  User, InsertUser, 
  MedicalRecord, InsertMedicalRecord,
  Access, InsertAccess
} from "@shared/schema";
import fs from "fs";
import path from "path";
import { generateTransactionHash } from "../client/src/lib/blockchain";
import crypto from "crypto";
import { DATA_PATH, UPLOADS_PATH } from "./env";

// Define interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Medical Record operations
  getMedicalRecord(id: number): Promise<MedicalRecord | undefined>;
  getMedicalRecordsByPatient(patientAddress: string): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord & { filePath: string }): Promise<MedicalRecord>;
  deleteMedicalRecord(id: number): Promise<boolean>;
  
  // Access Permission operations
  getAccess(id: number): Promise<Access | undefined>;
  getAccessByPatient(patientAddress: string): Promise<Access[]>;
  getAccessByDoctor(doctorAddress: string): Promise<Access[]>;
  createAccess(access: InsertAccess): Promise<Access>;
  revokeAccess(id: number): Promise<boolean>;
  
  // Helper function for accessible records
  getAccessibleRecordsByDoctor(doctorAddress: string): Promise<{ accessList: Access[], records: MedicalRecord[] }>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private medicalRecords: Map<number, MedicalRecord>;
  private accessPermissions: Map<number, Access>;
  private currentUserId: number;
  private currentRecordId: number;
  private currentAccessId: number;
  private dataPath: string;

  constructor() {
    this.users = new Map();
    this.medicalRecords = new Map();
    this.accessPermissions = new Map();
    this.currentUserId = 1;
    this.currentRecordId = 1;
    this.currentAccessId = 1;
    
    // Set the data path for storing files from environment configuration
    this.dataPath = DATA_PATH;
    
    // Create data directories if they don't exist
    this.initDataDirectories();
    
    // Load data from JSON file if it exists
    this.loadData();
  }

  // Initialize data directories
  private initDataDirectories() {
    // Use environment-defined paths
    const uploadsDir = UPLOADS_PATH;
    const dataDir = this.dataPath;
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  // Load data from JSON file
  private loadData() {
    const dataFile = path.join(this.dataPath, "data.json");
    
    if (fs.existsSync(dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
        
        // Load users
        if (data.users) {
          this.users = new Map(Object.entries(data.users).map(([id, user]) => [Number(id), user as User]));
          this.currentUserId = Math.max(...Array.from(this.users.keys()), 0) + 1;
        }
        
        // Load medical records
        if (data.medicalRecords) {
          this.medicalRecords = new Map(Object.entries(data.medicalRecords).map(([id, record]) => [Number(id), record as MedicalRecord]));
          this.currentRecordId = Math.max(...Array.from(this.medicalRecords.keys()), 0) + 1;
        }
        
        // Load access permissions
        if (data.accessPermissions) {
          this.accessPermissions = new Map(Object.entries(data.accessPermissions).map(([id, access]) => [Number(id), access as Access]));
          this.currentAccessId = Math.max(...Array.from(this.accessPermissions.keys()), 0) + 1;
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }
  }

  // Save data to JSON file
  private saveData() {
    const dataFile = path.join(this.dataPath, "data.json");
    
    const data = {
      users: Object.fromEntries(this.users),
      medicalRecords: Object.fromEntries(this.medicalRecords),
      accessPermissions: Object.fromEntries(this.accessPermissions),
    };
    
    try {
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByAddress(address: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.address.toLowerCase() === address.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    this.saveData();
    return user;
  }

  // Medical Record operations
  async getMedicalRecord(id: number): Promise<MedicalRecord | undefined> {
    return this.medicalRecords.get(id);
  }

  async getMedicalRecordsByPatient(patientAddress: string): Promise<MedicalRecord[]> {
    return Array.from(this.medicalRecords.values()).filter(
      (record) => record.patientAddress.toLowerCase() === patientAddress.toLowerCase(),
    );
  }

  async createMedicalRecord(record: InsertMedicalRecord & { filePath: string }): Promise<MedicalRecord> {
    const id = this.currentRecordId++;
    const now = new Date();
    
    // Generate file hash (in a real app, this would be the hash of the file content)
    const fileHash = crypto.createHash('sha256').update(record.title + Date.now()).digest('hex');
    
    // Simulate blockchain transaction hash
    const transactionHash = generateTransactionHash();
    
    const medicalRecord: MedicalRecord = { 
      ...record, 
      id, 
      fileHash,
      transactionHash,
      createdAt: now 
    };
    
    this.medicalRecords.set(id, medicalRecord);
    this.saveData();
    return medicalRecord;
  }
  
  async deleteMedicalRecord(id: number): Promise<boolean> {
    const record = this.medicalRecords.get(id);
    
    if (!record) {
      return false;
    }
    
    // Delete the file if it exists
    if (record.filePath && fs.existsSync(record.filePath)) {
      try {
        fs.unlinkSync(record.filePath);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }
    
    // Remove access permissions referencing this record
    Array.from(this.accessPermissions.entries()).forEach(([accessId, access]) => {
      if (access.recordIds.includes(id)) {
        // Filter out the deleted record ID
        const updatedRecordIds = access.recordIds.filter((recordId: number) => recordId !== id);
        
        if (updatedRecordIds.length === 0) {
          // If no records left, delete the access permission
          this.accessPermissions.delete(accessId);
        } else {
          // Update the record IDs
          this.accessPermissions.set(accessId, {
            ...access,
            recordIds: updatedRecordIds
          });
        }
      }
    });
    
    // Delete the record
    const success = this.medicalRecords.delete(id);
    
    if (success) {
      this.saveData();
    }
    
    return success;
  }

  // Access Permission operations
  async getAccess(id: number): Promise<Access | undefined> {
    return this.accessPermissions.get(id);
  }

  async getAccessByPatient(patientAddress: string): Promise<Access[]> {
    return Array.from(this.accessPermissions.values()).filter(
      (access) => access.patientAddress.toLowerCase() === patientAddress.toLowerCase(),
    );
  }

  async getAccessByDoctor(doctorAddress: string): Promise<Access[]> {
    return Array.from(this.accessPermissions.values()).filter(
      (access) => access.doctorAddress.toLowerCase() === doctorAddress.toLowerCase(),
    );
  }

  async createAccess(access: InsertAccess): Promise<Access> {
    const id = this.currentAccessId++;
    const now = new Date();
    const accessPermission: Access = { ...access, id, createdAt: now };
    this.accessPermissions.set(id, accessPermission);
    this.saveData();
    return accessPermission;
  }

  async revokeAccess(id: number): Promise<boolean> {
    const success = this.accessPermissions.delete(id);
    if (success) {
      this.saveData();
    }
    return success;
  }

  // Helper for getting accessible records for a doctor
  async getAccessibleRecordsByDoctor(doctorAddress: string): Promise<{ accessList: Access[], records: MedicalRecord[] }> {
    const accessList = await this.getAccessByDoctor(doctorAddress);
    // Convert Set to Array properly to avoid TypeScript errors
    const patientAddressSet = new Set<string>(accessList.map(access => access.patientAddress));
    const patientAddresses = Array.from(patientAddressSet);
    
    const records: MedicalRecord[] = [];
    for (const patientAddress of patientAddresses) {
      const patientRecords = await this.getMedicalRecordsByPatient(patientAddress);
      records.push(...patientRecords);
    }
    
    return { accessList, records };
  }
}

// Export singleton instance
export const storage = new MemStorage();
