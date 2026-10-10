// Development builds only (M4 plan, owner question 3): fixed onboarding answers for a test character on the live
// project, until M5 brings the real onboarding. Same answers as the live tests, in the device's zone.
export function testChoices(timeZone: string) {
  return {
    name: 'Tester',
    voice: 'system',
    goals: ['body'],
    classId: 'warrior',
    estimates: { strength: 5, vitality: 5, wisdom: 5, focus: 5, discipline: 4 },
    minutesPerDay: 25,
    difficulty: 'steady',
    boundaryMinutes: 240,
    timeZone,
    limitations: [],
    gentleStart: false,
    ownProgram: false,
  };
}
