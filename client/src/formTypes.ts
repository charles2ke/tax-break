import type { AgeCategory, AssessmentYear, CityType, HousePropertyType } from '@tax-break/tax-engine';

export interface FormState {
  assessmentYear: AssessmentYear;
  ageCategory: AgeCategory;
  salary: {
    basic: number;
    hraReceived: number;
    rentPaid: number;
    cityType: CityType;
    lta: number;
    specialAllowance: number;
  };
  houseProperty: {
    type: HousePropertyType;
    homeLoanInterest: number;
    annualRentReceived: number;
    municipalTaxesPaid: number;
  };
  otherIncome: {
    savingsInterest: number;
    otherInterest: number;
    dividendIncome: number;
    otherIncome: number;
  };
  deductions: {
    section80C: number;
    section80D: {
      selfAndFamilyPremium: number;
      parentsPremium: number;
      selfSenior: boolean;
      parentsSenior: boolean;
    };
    section80CCD1B: number;
    section80E: number;
    section80G: number;
  };
  capitalGains: {
    equitySTCG: number;
    equityLTCG: number;
    otherSTCG: number;
    otherLTCG: number;
  };
  taxAlreadyPaid: number;
}

export const initialFormState: FormState = {
  assessmentYear: 'FY2025-26',
  ageCategory: 'below60',
  salary: {
    basic: 0,
    hraReceived: 0,
    rentPaid: 0,
    cityType: 'metro',
    lta: 0,
    specialAllowance: 0,
  },
  houseProperty: {
    type: 'self-occupied',
    homeLoanInterest: 0,
    annualRentReceived: 0,
    municipalTaxesPaid: 0,
  },
  otherIncome: {
    savingsInterest: 0,
    otherInterest: 0,
    dividendIncome: 0,
    otherIncome: 0,
  },
  deductions: {
    section80C: 0,
    section80D: {
      selfAndFamilyPremium: 0,
      parentsPremium: 0,
      selfSenior: false,
      parentsSenior: false,
    },
    section80CCD1B: 0,
    section80E: 0,
    section80G: 0,
  },
  capitalGains: {
    equitySTCG: 0,
    equityLTCG: 0,
    otherSTCG: 0,
    otherLTCG: 0,
  },
  taxAlreadyPaid: 0,
};
