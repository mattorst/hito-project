
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class RegisterAPITests(APITestCase):

    def setUp(self):
        self.url = reverse("register")
        self.valid_data = {
            "username": "excursionista_prueba",
            "email": "excursionista@example.com",
            "password": "Bosque#72Luna!Roca",
            "password_confirm": "Bosque#72Luna!Roca",
        }

    def test_register_success(self):
        response = self.client.post(
            self.url,
            self.valid_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="excursionista_prueba")

        self.assertTrue(user.check_password("Bosque#72Luna!Roca"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.email, "excursionista@example.com")
        self.assertNotIn("password", response.data)

    def test_duplicate_username(self):
        User.objects.create_user(
            username="excursionista_prueba",
            email="original@example.com",
            password="Bosque#72Luna!Roca",
        )

        response = self.client.post(
            self.url,
            self.valid_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_duplicate_email(self):
        User.objects.create_user(
            username="usuario_existente",
            email="excursionista@example.com",
            password="Bosque#72Luna!Roca",
        )

        response = self.client.post(
            self.url,
            self.valid_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_password_mismatch(self):
        data = {
            **self.valid_data,
            "password_confirm": "OtraClave#123",
        }

        response = self.client.post(
            self.url,
            data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)

    def test_weak_password(self):
        data = {
            **self.valid_data,
            "password": "123",
            "password_confirm": "123",
        }

        response = self.client.post(
            self.url,
            data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_registration_cannot_grant_staff_privileges(self):
        data = {
            **self.valid_data,
            "is_staff": True,
            "is_superuser": True,
        }

        response = self.client.post(
            self.url,
            data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username="excursionista_prueba")

        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
