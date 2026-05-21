import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const next = i18n.language === 'am' ? 'en' : 'am';

  function toggle() {
    i18n.changeLanguage(next);
    localStorage.setItem('assa_lang', next);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle} title={t('lang.toggle')}>
      {next === 'am' ? 'አማ' : 'EN'}
    </Button>
  );
}
