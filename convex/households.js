import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const genderValue = v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"));

function randomCode() {
  const stamp = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `GH-${stamp}-${rand}`;
}

function normalizeHouseCode(code) {
  return (code || "").trim().toUpperCase();
}

function normalizeName(name) {
  return (name || "").trim().toLowerCase();
}

function normalizeForMatch(text) {
  return (text || "").toUpperCase().replace(/\s+/g, "");
}

function extractPossibleCodes(raw) {
  const normalizedRaw = normalizeForMatch(raw);
  const matches = normalizedRaw.match(/GH-[A-Z0-9]{3,}-[A-Z0-9]{2,}/g) || [];
  const unique = new Set(matches);
  if (normalizedRaw) unique.add(normalizedRaw);
  return Array.from(unique);
}

async function resolveHouseholdByCode(ctx, code) {
  const candidates = extractPossibleCodes(code);
  if (candidates.length === 0) return null;

  const all = await ctx.db.query("households").collect();
  if (all.length === 0) return null;

  const exact = all.filter((h) => {
    const hCode = normalizeForMatch(h.houseCode);
    return candidates.some((c) => c && hCode === c);
  });

  if (exact.length === 0) return null;
  exact.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  return exact[0];
}

async function ensureUniqueHouseCode(ctx, candidate) {
  let code = normalizeHouseCode(candidate) || randomCode();
  // Avoid collisions from repeated imports or manual duplicate codes.
  for (let i = 0; i < 12; i += 1) {
    const existing = await ctx.db
      .query("households")
      .withIndex("by_house_code", (q) => q.eq("houseCode", code))
      .collect();
    if (existing.length === 0) return code;
    code = `${normalizeHouseCode(candidate) || "GH"}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  return `${randomCode()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function ensureAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export const list = query({
  args: { q: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const q = (args.q || "").toLowerCase().trim();

    const households = await ctx.db.query("households").withIndex("by_updated").order("desc").collect();

    const members = await ctx.db.query("members").collect();
    const schemes = await ctx.db.query("schemes").collect();

    const memberByHouse = new Map();
    const schemeByHouse = new Map();

    for (const m of members) {
      if (!memberByHouse.has(m.householdId)) memberByHouse.set(m.householdId, []);
      memberByHouse.get(m.householdId).push(m);
    }

    for (const s of schemes) {
      if (!schemeByHouse.has(s.householdId)) schemeByHouse.set(s.householdId, []);
      schemeByHouse.get(s.householdId).push(s);
    }

    const rows = households.map((h) => {
      const m = memberByHouse.get(h._id) || [];
      const s = schemeByHouse.get(h._id) || [];
      return {
        ...h,
        memberCount: m.length,
        schemeCount: s.length,
        members: m,
        schemes: s,
      };
    });

    if (!q) return rows;

    return rows.filter((h) => {
      if (h.headName.toLowerCase().includes(q)) return true;
      if (h.address.toLowerCase().includes(q)) return true;
      if (h.houseCode.toLowerCase().includes(q)) return true;
      if ((h.phone || "").toLowerCase().includes(q)) return true;
      if ((h.secondaryMobile || "").toLowerCase().includes(q)) return true;
      if ((h.aadhaarNumber || "").toLowerCase().includes(q)) return true;
      if ((h.rationCardNumber || "").toLowerCase().includes(q)) return true;
      if ((h.voterIdNumber || "").toLowerCase().includes(q)) return true;
      if (h.members.some((m) => (m.name || "").toLowerCase().includes(q))) return true;
      if (h.schemes.some((s) => (s.schemeName || "").toLowerCase().includes(q))) return true;
      return false;
    });
  },
});

export const getByCode = query({
  args: { houseCode: v.string() },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const household = await resolveHouseholdByCode(ctx, args.houseCode);
    if (!household) return null;
    const members = await ctx.db.query("members").withIndex("by_household", (q) => q.eq("householdId", household._id)).collect();
    const schemes = await ctx.db.query("schemes").withIndex("by_household", (q) => q.eq("householdId", household._id)).collect();
    return { ...household, members, schemes };
  },
});

export const getByCodePublic = internalQuery({
  args: { houseCode: v.string() },
  handler: async (ctx, args) => {
    const household = await resolveHouseholdByCode(ctx, args.houseCode);
    if (!household) return null;
    const members = await ctx.db.query("members").withIndex("by_household", (q) => q.eq("householdId", household._id)).collect();
    const schemes = await ctx.db.query("schemes").withIndex("by_household", (q) => q.eq("householdId", household._id)).collect();
    return { ...household, members, schemes };
  },
});

export const getOne = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const household = await ctx.db.get(args.householdId);
    if (!household) return null;
    const members = await ctx.db.query("members").withIndex("by_household", (q) => q.eq("householdId", household._id)).collect();
    const schemes = await ctx.db.query("schemes").withIndex("by_household", (q) => q.eq("householdId", household._id)).collect();
    return { ...household, members, schemes };
  },
});

export const create = mutation({
  args: {
    address: v.string(),
    headName: v.string(),
    phone: v.optional(v.string()),
    aadhaarNumber: v.optional(v.string()),
    secondaryMobile: v.optional(v.string()),
    rationCardNumber: v.optional(v.string()),
    voterIdNumber: v.optional(v.string()),
    languagePreference: v.union(v.literal("en"), v.literal("te")),
  },
  handler: async (ctx, args) => {
    const userId = await ensureAuth(ctx);
    const now = Date.now();
    const houseCode = await ensureUniqueHouseCode(ctx, randomCode());
    return await ctx.db.insert("households", {
      houseCode,
      address: args.address,
      headName: args.headName,
      phone: args.phone,
      aadhaarNumber: args.aadhaarNumber,
      secondaryMobile: args.secondaryMobile,
      rationCardNumber: args.rationCardNumber,
      voterIdNumber: args.voterIdNumber,
      languagePreference: args.languagePreference,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    householdId: v.id("households"),
    address: v.string(),
    headName: v.string(),
    phone: v.optional(v.string()),
    aadhaarNumber: v.optional(v.string()),
    secondaryMobile: v.optional(v.string()),
    rationCardNumber: v.optional(v.string()),
    voterIdNumber: v.optional(v.string()),
    languagePreference: v.union(v.literal("en"), v.literal("te")),
  },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const existing = await ctx.db.get(args.householdId);
    if (!existing) throw new Error("Household not found");
    await ctx.db.patch(args.householdId, {
      address: args.address,
      headName: args.headName,
      phone: args.phone,
      aadhaarNumber: args.aadhaarNumber,
      secondaryMobile: args.secondaryMobile,
      rationCardNumber: args.rationCardNumber,
      voterIdNumber: args.voterIdNumber,
      languagePreference: args.languagePreference,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const existing = await ctx.db.get(args.householdId);
    if (!existing) throw new Error("Household not found");
    const members = await ctx.db.query("members").withIndex("by_household", (q) => q.eq("householdId", args.householdId)).collect();
    const schemes = await ctx.db.query("schemes").withIndex("by_household", (q) => q.eq("householdId", args.householdId)).collect();
    for (const m of members) await ctx.db.delete(m._id);
    for (const s of schemes) await ctx.db.delete(s._id);
    await ctx.db.delete(args.householdId);
    return { ok: true };
  },
});

export const addMember = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    relation: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(genderValue),
    occupation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const household = await ctx.db.get(args.householdId);
    if (!household) throw new Error("Household not found");
    if (normalizeName(args.name) === normalizeName(household.headName)) {
      throw new Error("Head of family is already captured in household profile");
    }
    await ctx.db.insert("members", {
      householdId: args.householdId,
      name: args.name,
      relation: args.relation,
      age: args.age,
      gender: args.gender,
      occupation: args.occupation,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.householdId, { updatedAt: Date.now() });
  },
});

export const updateMember = mutation({
  args: {
    memberId: v.id("members"),
    name: v.string(),
    relation: v.optional(v.string()),
    age: v.optional(v.number()),
    gender: v.optional(genderValue),
    occupation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const existing = await ctx.db.get(args.memberId);
    if (!existing) return { ok: false };
    const household = await ctx.db.get(existing.householdId);
    if (!household) throw new Error("Household not found");
    if (normalizeName(args.name) === normalizeName(household.headName)) {
      throw new Error("Head of family is already captured in household profile");
    }
    await ctx.db.patch(args.memberId, {
      name: args.name,
      relation: args.relation,
      age: args.age,
      gender: args.gender,
      occupation: args.occupation,
    });
    await ctx.db.patch(existing.householdId, { updatedAt: Date.now() });
    return { ok: true };
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const m = await ctx.db.get(args.memberId);
    if (!m) return;
    await ctx.db.delete(args.memberId);
    await ctx.db.patch(m.householdId, { updatedAt: Date.now() });
  },
});

export const addScheme = mutation({
  args: {
    householdId: v.id("households"),
    schemeName: v.string(),
    status: v.string(),
    benefitAmount: v.optional(v.number()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    await ctx.db.insert("schemes", {
      householdId: args.householdId,
      schemeName: args.schemeName,
      status: args.status,
      benefitAmount: args.benefitAmount,
      remarks: args.remarks,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.householdId, { updatedAt: Date.now() });
  },
});

export const updateScheme = mutation({
  args: {
    schemeId: v.id("schemes"),
    schemeName: v.string(),
    status: v.string(),
    benefitAmount: v.optional(v.number()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const existing = await ctx.db.get(args.schemeId);
    if (!existing) return { ok: false };
    await ctx.db.patch(args.schemeId, {
      schemeName: args.schemeName,
      status: args.status,
      benefitAmount: args.benefitAmount,
      remarks: args.remarks,
    });
    await ctx.db.patch(existing.householdId, { updatedAt: Date.now() });
    return { ok: true };
  },
});

export const removeScheme = mutation({
  args: { schemeId: v.id("schemes") },
  handler: async (ctx, args) => {
    await ensureAuth(ctx);
    const s = await ctx.db.get(args.schemeId);
    if (!s) return;
    await ctx.db.delete(args.schemeId);
    await ctx.db.patch(s.householdId, { updatedAt: Date.now() });
  },
});

export const importCsvRows = mutation({
  args: {
    rows: v.array(
      v.object({
        houseCode: v.optional(v.string()),
        address: v.string(),
        headName: v.string(),
        phone: v.optional(v.string()),
        aadhaarNumber: v.optional(v.string()),
        secondaryMobile: v.optional(v.string()),
        rationCardNumber: v.optional(v.string()),
        voterIdNumber: v.optional(v.string()),
        languagePreference: v.optional(v.union(v.literal("en"), v.literal("te"))),
        members: v.optional(
          v.array(
            v.object({
              name: v.string(),
              relation: v.optional(v.string()),
              age: v.optional(v.number()),
              gender: v.optional(genderValue),
              occupation: v.optional(v.string()),
            })
          )
        ),
        schemes: v.optional(
          v.array(
            v.object({
              schemeName: v.string(),
              status: v.string(),
              benefitAmount: v.optional(v.number()),
              remarks: v.optional(v.string()),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await ensureAuth(ctx);
    let imported = 0;
    for (const row of args.rows) {
      const now = Date.now();
      const generatedCode = await ensureUniqueHouseCode(ctx, row.houseCode || randomCode());
      const resolvedId = await ctx.db.insert("households", {
        houseCode: generatedCode,
        address: row.address,
        headName: row.headName,
        phone: row.phone,
        aadhaarNumber: row.aadhaarNumber,
        secondaryMobile: row.secondaryMobile,
        rationCardNumber: row.rationCardNumber,
        voterIdNumber: row.voterIdNumber,
        languagePreference: row.languagePreference || "en",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      for (const m of row.members || []) {
        if (normalizeName(m.name) === normalizeName(row.headName)) continue;
        await ctx.db.insert("members", {
          householdId: resolvedId,
          name: m.name,
          relation: m.relation,
          age: m.age,
          gender: m.gender,
          occupation: m.occupation,
          createdAt: now,
        });
      }
      for (const s of row.schemes || []) {
        await ctx.db.insert("schemes", {
          householdId: resolvedId,
          schemeName: s.schemeName,
          status: s.status,
          benefitAmount: s.benefitAmount,
          remarks: s.remarks,
          createdAt: now,
        });
      }
      imported += 1;
    }
    return { imported };
  },
});
