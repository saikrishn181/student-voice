import test from "node:test"
import assert from "node:assert/strict"
import { checkInappropriateContent } from "./moderation-runner.mjs"

test("moderation allows clean student posts", () => {
  const result1 = checkInappropriateContent("The library needs more study spaces during exams", ["library", "exams"])
  assert.equal(result1.isAllowed, true)

  const result2 = checkInappropriateContent("Hostel mess food quality has dropped, please sign our petition", ["hostel", "messFood"])
  assert.equal(result2.isAllowed, true)

  const result3 = checkInappropriateContent("Campus wifi is down in Block C since yesterday", ["wifi", "campus"])
  assert.equal(result3.isAllowed, true)
})

test("moderation blocks severe profanity & abuses", () => {
  const result = checkInappropriateContent("This is total bullshit and fuck this professor")
  assert.equal(result.isAllowed, false)
  assert.equal(result.category, "profanity")
})

test("moderation blocks abusive slang and gaalis", () => {
  const result = checkInappropriateContent("tum sab bhenchod ho")
  assert.equal(result.isAllowed, false)
  assert.equal(result.category, "profanity")
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

test("moderation blocks explicit NSFW content", () => {
  const result = checkInappropriateContent("check out my leaked sex chat and nude pics")
  assert.equal(result.isAllowed, false)
  assert.equal(result.category, "explicit")
})

test("moderation blocks inappropriate hashtags", () => {
  const result = checkInappropriateContent("Normal post text here", ["cleanTag", "bitch"])
  assert.equal(result.isAllowed, false)
})
