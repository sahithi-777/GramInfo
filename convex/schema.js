import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const genderValue = v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"));

export default defineSchema({
  ...authTables,
  households: defineTable({
    houseCode: v.string(),
    address: v.string(),
    headName: v.string(),
    phone: v.optional(v.string()),
    aadhaarNumber: v.optional(v.string()),
    secondaryMobile: v.optional(v.string()),
    rationCardNumber: v.optional(v.string()),
    voterIdNumber: v.optional(v.string()),
    languagePreference: v.union(v.literal("en"), v.literal("te")),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_house_code", ["houseCode"])
    .index("by_updated", ["updatedAt"]),
  members: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    relation: v.optional(v.string()),
    age: v.optional(v.number()),
    dob: v.optional(v.string()),
    gender: v.optional(genderValue),
    aadhaarNumber: v.optional(v.string()),
    mobileNumber: v.optional(v.string()),
    maritalStatus: v.optional(v.string()),
    disabilityStatus: v.optional(v.string()),
    occupation: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_household", ["householdId"]),
  schemes: defineTable({
    householdId: v.id("households"),
    schemeName: v.string(),
    status: v.string(),
    benefitAmount: v.optional(v.number()),
    remarks: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_household", ["householdId"]),
  profiles: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    phone: v.string(),
    designation: v.string(),
    panchayatName: v.string(),
    villageName: v.string(),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
