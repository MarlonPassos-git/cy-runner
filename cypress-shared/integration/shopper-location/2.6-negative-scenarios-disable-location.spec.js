import {
  loginAsAdmin,
  loginAsUser,
  preserveCookie,
  updateRetry,
} from '../../support/common/support'
import { verifyLocation } from '../../support/shopper-location/common'
import shopperLocationConstants from '../../support/shopper-location/constants'
import selectors from '../../support/common/selectors'

const prefix = 'Disable location'

describe('Location validation', () => {
  before(() => {
    loginAsAdmin()
    cy.getVtexItems().then((vtex) => {
      loginAsUser(vtex.robotMail, vtex.robotPassword)
    })
  })

  // eslint-disable-next-line jest/expect-expect
  it(`${prefix} - Test negative scenarios`, updateRetry(2), () => {
    verifyLocation()
    cy.get(selectors.AddressErrorContainer).should(
      'have.text',
      shopperLocationConstants.faildFindLocation
    )
  })

  preserveCookie()
})
