import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'am' ? 'en' : 'am';
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        i18n.changeLanguage(next);
        localStorage.setItem('assa_lang', next);
      }}
    >
      {next === 'am' ? 'አማ' : 'EN'}
    </Button>
  );
}
