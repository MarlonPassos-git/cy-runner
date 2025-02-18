import { loadDocksAPI, calculateShippingAPI } from '../common/apis'
import { updateRetry } from '../common/support'
import { FAIL_ON_STATUS_CODE } from '../common/constants'

export function loadDocks() {
  it('Load all dock connection', updateRetry(3), () => {
    cy.getVtexItems().then((vtex) => {
      cy.getAPI(loadDocksAPI(vtex.baseUrl)).then((response) => {
        expect(response.status).to.have.equal(200)
      })
    })
  })
}

export function loadCalculateShippingAPI(data, validateResponseFn) {
  return cy.getVtexItems().then((vtex) => {
    cy.getAppSettingstoJSON().then((items) => {
      cy.request({
        method: 'POST',
        url: calculateShippingAPI(vtex.account, Cypress.env('workspace').name),
        headers: {
          VtexIdclientAutCookie: items[vtex.userAuthCookieName],
        },
        ...FAIL_ON_STATUS_CODE,
        body: data,
      }).as('RESPONSE')

      if (validateResponseFn) {
        cy.get('@RESPONSE').then((response) => {
          expect(response.status).to.have.equal(200)
          validateResponseFn(response)
        })
      } else {
        return cy.get('@RESPONSE')
      }
    })
  })
}

export function validateCalculateShipping(response) {
  expect(response.status).to.have.equal(200)
  // If we receive empty array with valid payload then we can assume that fedex shipping site is down
  expect(response.body).to.be.an('array').and.to.have.lengthOf.above(0)
}

export function validateNonSupportedCountryCalculateShipping(response) {
  expect(response.status).to.have.equal(200)
  expect(response.body).to.be.an('array').and.to.be.empty
  // If we receive empty array with valid payload then we can assume that fedex shipping site is down
  // expect(response.body).to.be.an('array').and.to.have.lengthOf.above(0)
}

export function validateCustomDeliveryTime(response) {
  expect(response.status).to.have.equal(200)
  expect(response.body).to.be.an('array').and.to.have.lengthOf.above(0)
  if (response.body[0].estimateDate === null) {
    expect(response.body[0].estimateDate).to.have.equal('0')
  }
}
