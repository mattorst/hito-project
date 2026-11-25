
from django import forms

from apps.incidents.models_followup import (
    IncidentReviewStatus,
)


class IncidentFollowUpForm(forms.Form):

    status = forms.ChoiceField(
        label="Estado de atención",
        choices=IncidentReviewStatus.choices,
    )

    notes = forms.CharField(
        label="Observaciones del guardaparque",
        min_length=5,
        widget=forms.Textarea(
            attrs={
                "rows": 5,
                "placeholder": (
                    "Describe la revisión realizada, "
                    "las medidas adoptadas o el "
                    "resultado de la atención..."
                ),
            }
        ),
    )

    def clean_notes(self):
        notes = self.cleaned_data["notes"].strip()

        if len(notes) < 5:
            raise forms.ValidationError(
                "Ingresa al menos cinco caracteres."
            )

        return notes
