import { describe, expect, it } from 'vitest'
import { createEmptyReport } from './report'
import { validatePersonalDetails } from './personalDetailsValidation'

describe('validatePersonalDetails', () => {
  it('requires all personal details', () => {
    expect(
      validatePersonalDetails(createEmptyReport().personalDetails),
    ).toEqual({
      lastName: 'Bitte den Nachnamen eingeben.',
      firstName: 'Bitte den Vornamen eingeben.',
    })
  })

  it('accepts empty optional details and trims required details', () => {
    expect(
      validatePersonalDetails({
        lastName: ' Müller ',
        firstName: ' Erika ',
        personnelNumber: '',
        department: '',
      }),
    ).toEqual({})
  })
})
