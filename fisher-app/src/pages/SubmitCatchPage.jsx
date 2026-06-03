import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import Step1Details from '../components/CatchWizard/Step1Details';
import Step2Location from '../components/CatchWizard/Step2Location';
import Step3Photo from '../components/CatchWizard/Step3Photo';
import Step4Review from '../components/CatchWizard/Step4Review';
import StatusBadge from '../components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SubmitCatchPage() {
  const { t } = useTranslation();
  const STEP_LABELS = [t('submit.stepDetails'), t('submit.stepLocation'), t('submit.stepPhoto'), t('submit.stepReview')];
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [zones, setZones] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    species: '',
    quantity_kg: '',
    number_of_fish: '',
    fishing_gear: '',
    fishing_date: new Date().toISOString().split('T')[0],
    fishing_time: new Date().toTimeString().slice(0, 5),
    zone_id: '',
    gps_lat: '',
    gps_lng: '',
    photo_urls: [],
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsTakingTooLong, setGpsTakingTooLong] = useState(false);

  useEffect(() => {
    api.get('/zones').then((res) => setZones(res.data.zones));
  }, []);

  function captureDeviceGps() {
    if (!navigator.geolocation) {
      setGpsError(t('submit.gpsNotAvailable'));
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    setGpsTakingTooLong(false);

    const timer = setTimeout(() => {
      setGpsTakingTooLong(true);
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        set('gps_lat', pos.coords.latitude);
        set('gps_lng', pos.coords.longitude);
        setGpsLoading(false);
        setGpsTakingTooLong(false);
      },
      () => {
        clearTimeout(timer);
        setGpsError(t('submit.gpsError'));
        setGpsLoading(false);
        setGpsTakingTooLong(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  useEffect(() => {
    if (step === 2) captureDeviceGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  }

  function selectZone(zoneId) {
    const zone = zones.find((z) => z.id === Number(zoneId));
    set('zone_id', zoneId);
    if (zone) {
      set('gps_lat', zone.gps_lat);
      set('gps_lng', zone.gps_lng);
    }
  }

  function validateStep1() {
    const e = {};
    if (!form.species) e.species = t('submit.errorSpecies');
    if (!form.quantity_kg || form.quantity_kg <= 0 || form.quantity_kg > 500)
      e.quantity_kg = t('submit.errorQuantity');
    if (!form.fishing_gear) e.fishing_gear = t('submit.errorGear');
    if (!form.fishing_date) e.fishing_date = t('submit.errorDate');
    if (!form.fishing_time) e.fishing_time = t('submit.errorTime');
    if (form.fishing_date > new Date().toISOString().split('T')[0])
      e.fishing_date = t('submit.errorFutureDate');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e = {};
    if (!form.zone_id) e.zone_id = t('submit.errorZone');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  }

  function addPhoto(url) {
    set('photo_urls', [...form.photo_urls, url]);
  }

  function removePhoto(index) {
    set(
      'photo_urls',
      form.photo_urls.filter((_, i) => i !== index),
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity_kg: Number(form.quantity_kg),
        number_of_fish: form.number_of_fish ? Number(form.number_of_fish) : undefined,
        zone_id: Number(form.zone_id),
        gps_lat: Number(form.gps_lat),
        gps_lng: Number(form.gps_lng),
      };
      const res = await api.post('/catches', payload);
      setResult(res.data);
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || t('submit.errorSubmit') });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-foreground">{t('submit.success')}</h2>
        <p className="text-muted-foreground mt-2">{t('submit.successDesc')}</p>
        <Card className="mt-6 w-full text-left">
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground mb-1">Reference ID</div>
            <div className="font-mono font-bold text-primary text-lg">{result.reference_id}</div>
            <div className="mt-2">
              <StatusBadge status="PENDING" />
            </div>
            {result.zone_flag && (
              <div className="mt-3 text-xs text-warning bg-warning-muted border border-warning/30 p-2 rounded-lg">
                Your catch was flagged for zone review. An admin will review it shortly.
              </div>
            )}
          </CardContent>
        </Card>
        <Button className="mt-6 w-full" onClick={() => navigate('/catches')}>
          {t('catches.title')}
        </Button>
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() => {
            setResult(null);
            setStep(1);
            setForm({
              species: '',
              quantity_kg: '',
              number_of_fish: '',
              fishing_gear: '',
              fishing_date: new Date().toISOString().split('T')[0],
              fishing_time: new Date().toTimeString().slice(0, 5),
              zone_id: '',
              gps_lat: '',
              gps_lng: '',
              photo_urls: [],
            });
          }}
        >
          {t('submit.submitAnother')}
        </Button>
      </div>
    );
  }

  const selectedZone = zones.find((z) => z.id === Number(form.zone_id));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate('/'))}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('submit.title')}</h2>
          <p className="text-xs text-muted-foreground">
            Step {step} of 4 — {STEP_LABELS[step - 1]}
          </p>
        </div>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 1 && <Step1Details form={form} errors={errors} onChange={set} />}
      {step === 2 && (
        <Step2Location
          form={form}
          zones={zones}
          errors={errors}
          onZoneSelect={selectZone}
          onCaptureGps={captureDeviceGps}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
          gpsTakingTooLong={gpsTakingTooLong}
          onSkipGps={() => {
            setGpsLoading(false);
            setGpsTakingTooLong(false);
            if (form.zone_id) {
              const zone = zones.find((z) => z.id === Number(form.zone_id));
              if (zone) {
                set('gps_lat', zone.gps_lat);
                set('gps_lng', zone.gps_lng);
              }
            }
          }}
        />
      )}
      {step === 3 && (
        <Step3Photo photos={form.photo_urls} onAddPhoto={addPhoto} onRemove={removePhoto} />
      )}
      {step === 4 && <Step4Review form={form} selectedZone={selectedZone} />}

      {step === 4 && errors.submit && <p className="text-destructive text-sm">{errors.submit}</p>}

      <div className="flex gap-3 pt-2">
        {step > 1 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
            {t('submit.prev')}
          </Button>
        )}
        {step < 4 ? (
          <Button className="flex-1" onClick={nextStep}>
            {t('submit.next')}
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('submit.submitting') : t('submit.submitCatch')}
          </Button>
        )}
      </div>
    </div>
  );
}
