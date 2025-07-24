import he from 'he'
import richtypo from 'richtypo'
import {
  definitions,
  abbrs,
  amps,
  dashesBasic,
  degreeSigns,
  ellipses,
  numberUnits,
  shortWords,
  hyphenatedWords,
  quotesFactory
} from 'richtypo/rules/common'
import {
  prepositions as englishPrepositions,
  dashesAdvanced as englishAdvancedDashes,
  numberOrdinals as englishNumberOrdials,
  //numberSeparators as englishNumberSeparators
} from 'richtypo/rules/en'
import {
  dashesAdvanced as russianAdvancedDashes,
  etcs as russianEtcs,
  numberSigns as russianNumberSigns,
  sectionSigns as russianSectionSigns,
  initials as russianInitials,
  particles as russuianParticles,
  //numberSeparators as russianNumberSeparators
} from 'richtypo/rules/ru'

import type {SupportedLanguage} from '../types.ts'

const {space} = definitions

export function orphans(text: string): string {
  return text.replaceAll(
    new RegExp(`(\\S+)${space}([\\S<]{1,10}(?:\n\n|$))`, 'gmi'),
    '<span class="no-orphans"><span class="first-word">$1</span> <span class="last-word">$2</span></span>'
  )
}

const englishQuotes = quotesFactory({
  openingQuote: '“',
  closingQuote: '”'
})

const russianQuotes = quotesFactory({
  openingQuote: '«',
  closingQuote: '»'
})

const commonRules = [
  amps,
  dashesBasic,
  degreeSigns,
  ellipses,
  numberUnits,
  shortWords,
  hyphenatedWords,
  orphans,
  abbrs
]

const englishRules = [
  ...commonRules,
  englishQuotes,
  englishPrepositions,
  englishAdvancedDashes,
  englishNumberOrdials,
  //englishNumberSeparators
]
const russianRules = [
  ...commonRules,
  russianQuotes,
  russianAdvancedDashes,
  russianEtcs,
  russianNumberSigns,
  russianSectionSigns,
  russianInitials,
  russuianParticles,
  //russianNumberSeparators
]

export function typographyText(text: string, lang: SupportedLanguage): string {
  let processedText = text
    .replace(/\u00A0/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<0xa0>/gi, ' ')

  processedText = he.decode(processedText)

  switch (lang) {
    case 'ru':
      return richtypo(russianRules, processedText)
    case 'en':
      return richtypo(englishRules, processedText)
    default:
      console.warn(`Unknown language, applying common typography rules`)
      return richtypo(commonRules, processedText)
  }
}
