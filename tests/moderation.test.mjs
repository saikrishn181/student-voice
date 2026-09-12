import test from "node:test"
import assert from "node:assert/strict"
import {
  checkInappropriateContent,
  calculateStrikePolicy,
  checkUserBanStatus,
  evaluateReportThreshold,
} from "./moderation-runner.mjs"

test("moderation allows clean student posts", () => {
  const result1 = checkInappropriateContent("The library needs more study spaces during exams", ["library", "exams"])
  assert.equal(result1.isAllowed, true)
  assert.equal(result1.isNsfw, false)

  const result2 = checkInappropriateContent("Hostel mess food quality has dropped, please sign our petition", ["hostel", "messFood"])
  assert.equal(result2.isAllowed, true)

  const result3 = checkInappropriateContent("Campus wifi is down in Block C since yesterday", ["wifi", "campus"])
  assert.equal(result3.isAllowed, true)
})

test("moderation detects and flags NSFW content", () => {
  const result = checkInappropriateContent("check out explicit porn and leaked nsfw photos")
  assert.equal(result.isAllowed, false)
  assert.equal(result.isNsfw, true)
  assert.equal(result.category, "nsfw")
})

test("moderation blocks severe profanity & abuses", () => {
  const result = checkInappropriateContent("This is total bullshit and fuck this professor")
  assert.equal(result.isAllowed, false)
  assert.equal(result.category, "profanity")
})

test("moderation blocks repeated-character leetspeak obfuscation", () => {
  const result = checkInappropriateContent("this is total fuuuuck")
  assert.equal(result.isAllowed, false)
  assert.equal(result.category, "profanity")
})

test("moderation blocks abusive slang and gaalis", () => {
  const result = checkInappropriateContent("tum sab bhenchod ho")
  assert.equal(result.isAllowed, false)
  assert.equal(result.category, "profanity")
})

test("moderation blocks regional campus slang (Telugu, Tamil, Marathi)", () => {
  const teluguRes = checkInappropriateContent("you are a waste lanja")
  assert.equal(teluguRes.isAllowed, false)
  assert.equal(teluguRes.category, "profanity")

  const tamilRes = checkInappropriateContent("go away thevidiya")
  assert.equal(tamilRes.isAllowed, false)
  assert.equal(tamilRes.category, "profanity")

  const marathiRes = checkInappropriateContent("kay re lavdya")
  assert.equal(marathiRes.isAllowed, false)
  assert.equal(marathiRes.category, "profanity")
})

test("moderation blocks harassment and death threats", () => {
  const result = checkInappropriateContent("i will kill you if you come to class")
  assert.equal(result.isAllowed, false)
  assert.equal(result.category, "harassment")
})

test("moderation blocks hate speech and derogatory slurs", () => {
  const result = checkInappropriateContent("get out of here you retard")
  assert.equal(result.isAllowed, false)
  assert.equal(result.category, "hate_speech")
})

test("moderation blocks inappropriate hashtags", () => {
  const result = checkInappropriateContent("Normal post text here", ["cleanTag", "bitch"])
  assert.equal(result.isAllowed, false)
})

test("community report threshold triggers auto-blur at 3 reports and remove at 5 reports", () => {
  const underThreshold = evaluateReportThreshold(2)
  assert.equal(underThreshold.action, "none")
  assert.equal(underThreshold.shouldStrike, false)

  const blurThreshold = evaluateReportThreshold(3)
  assert.equal(blurThreshold.action, "blur")
  assert.equal(blurThreshold.shouldStrike, false)

  const removeThreshold = evaluateReportThreshold(5)
  assert.equal(removeThreshold.action, "remove")
  assert.equal(removeThreshold.shouldStrike, true)
})

test("strike policy issues warnings for strikes 1 and 2", () => {
  const strike1 = calculateStrikePolicy(0)
  assert.equal(strike1.strikeCount, 1)
  assert.equal(strike1.isBanned, false)
  assert.match(strike1.message, /Strike 1 of 10/)

  const strike2 = calculateStrikePolicy(1)
  assert.equal(strike2.strikeCount, 2)
  assert.equal(strike2.isBanned, false)
  assert.match(strike2.message, /Strike 2 of 10/)
})

test("strike policy applies 24-hour temporary suspension at 3 strikes", () => {
  const strike3 = calculateStrikePolicy(2)
  assert.equal(strike3.strikeCount, 3)
  assert.equal(strike3.isBanned, true)
  assert.ok(strike3.bannedUntil !== null)
  assert.match(strike3.message, /temporarily restricted for 24 hours/)
})

test("strike policy applies 7-day temporary suspension at 6 strikes", () => {
  const strike6 = calculateStrikePolicy(5)
  assert.equal(strike6.strikeCount, 6)
  assert.equal(strike6.isBanned, true)
  assert.ok(strike6.bannedUntil !== null)
  assert.match(strike6.message, /temporarily suspended for 7 days/)
})

test("strike policy permanently bans account after 10 strikes", () => {
  const strike10 = calculateStrikePolicy(9)
  assert.equal(strike10.strikeCount, 10)
  assert.equal(strike10.isBanned, true)
  assert.equal(strike10.bannedUntil, null) // permanent
  assert.match(strike10.message, /permanently banned/)
})

test("checkUserBanStatus distinguishes active vs expired bans", () => {
  // 1. Unbanned user
  const cleanUser = { isBanned: false }
  assert.deepEqual(checkUserBanStatus(cleanUser), { isBanned: false, isPermanent: false })

  // 2. Permanently banned user
  const permUser = { isBanned: true, bannedUntil: undefined }
  assert.deepEqual(checkUserBanStatus(permUser), { isBanned: true, isPermanent: true })

  // 3. Temporarily banned user (active)
  const activeTempUser = {
    isBanned: true,
    bannedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
  const tempStatus = checkUserBanStatus(activeTempUser)
  assert.equal(tempStatus.isBanned, true)
  assert.equal(tempStatus.isPermanent, false)
  assert.equal(tempStatus.remainingDays, 3)

  // 4. Temporarily banned user (expired)
  const expiredUser = {
    isBanned: true,
    bannedUntil: new Date(Date.now() - 1000).toISOString(),
  }
  assert.deepEqual(checkUserBanStatus(expiredUser), { isBanned: false, isPermanent: false })
})
