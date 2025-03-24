import type {SupportedLanguage} from '../types.ts'

import {LOCALIZED_TEXT} from './localization.ts'

/**
 * Formats an ISO date string into a human-readable localized date
 *
 * @param isoDate - ISO date string to format
 * @param lang - Language code for formatting
 * @returns Formatted date string
 */
export function formatDate(isoDate: string, lang: SupportedLanguage): string {
  if (
    !isoDate ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(isoDate)
  ) {
    console.warn('Invalid date format provided:', isoDate)
    return ''
  }

  try {
    const date = new Date(isoDate)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }

    const formatter = new Intl.DateTimeFormat(lang, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return formatter.format(date)
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * Gets localized text based on the current language
 *
 * @param key - Text key to retrieve
 * @param lang - Current language
 * @returns Localized text string
 */
export function getLocalizedText(
  key: keyof typeof LOCALIZED_TEXT.en,
  lang: SupportedLanguage
): string {
  return LOCALIZED_TEXT[lang][key]
}

/**
 * Validates that a string is a supported language code
 *
 * @param lang - Language code to validate
 * @returns Whether the language is supported
 */
export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return lang === 'en' || lang === 'ru'
}
