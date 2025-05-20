import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  role: text("role", { enum: ["patient", "doctor"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  address: true,
  role: true,
});

// Medical records schema
export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  recordType: text("record_type").notNull(),
  recordDate: text("record_date").notNull(),
  patientAddress: text("patient_address").notNull(),
  filePath: text("file_path").notNull(),
  fileHash: text("file_hash").notNull(),
  transactionHash: text("transaction_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).pick({
  title: true,
  recordType: true,
  recordDate: true,
  patientAddress: true,
});

// Access permissions schema
export const accessPermissions = pgTable("access_permissions", {
  id: serial("id").primaryKey(),
  patientAddress: text("patient_address").notNull(),
  doctorAddress: text("doctor_address").notNull(),
  recordIds: integer("record_ids").array().notNull(),
  duration: text("duration", { 
    enum: ["1-day", "7-days", "30-days", "permanent"] 
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccessSchema = createInsertSchema(accessPermissions).pick({
  patientAddress: true,
  doctorAddress: true,
  recordIds: true,
  duration: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type MedicalRecord = typeof medicalRecords.$inferSelect;

export type InsertAccess = z.infer<typeof insertAccessSchema>;
export type Access = typeof accessPermissions.$inferSelect;
