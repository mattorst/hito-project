
from django import forms
from django.contrib.auth.forms import AuthenticationForm


class StaffLoginForm(AuthenticationForm):
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)

        if not user.is_staff:
            raise forms.ValidationError(
                "No tienes autorización para acceder al panel.",
                code="not_staff",
            )
