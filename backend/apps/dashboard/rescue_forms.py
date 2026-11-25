
from django import forms

from apps.rescues.models import RescueStatus


class RescueNotesForm(forms.Form):
    """
    Permite actualizar las observaciones de
    una solicitud de rescate activa.
    """

    notes = forms.CharField(
        label="Observaciones de atención",
        required=False,
        widget=forms.Textarea(
            attrs={
                "rows": 5,
                "placeholder": (
                    "Registrar información relevante "
                    "para la atención del rescate..."
                ),
            }
        ),
    )


class RescueCloseForm(forms.Form):
    """
    Cierre controlado de solicitudes de rescate.

    Solo permite los estados finales definidos
    en el modelo Rescue.
    """

    status = forms.ChoiceField(
        label="Resultado del rescate",
        choices=[
            (
                RescueStatus.COMPLETED,
                "Rescate completado",
            ),
            (
                RescueStatus.CANCELLED,
                "Rescate cancelado",
            ),
        ],
        widget=forms.Select(),
    )

    closed_reason = forms.CharField(
        label="Motivo de cierre",
        min_length=5,
        widget=forms.Textarea(
            attrs={
                "rows": 4,
                "placeholder": (
                    "Explica el resultado de la atención "
                    "y el motivo del cierre..."
                ),
            }
        ),
    )

    def clean_closed_reason(self):
        reason = self.cleaned_data[
            "closed_reason"
        ].strip()

        if len(reason) < 5:
            raise forms.ValidationError(
                "Debes indicar un motivo de cierre válido."
            )

        return reason
