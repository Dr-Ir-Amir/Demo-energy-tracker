from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Create a demo user for testing'

    def handle(self, *args, **options):
        if not User.objects.filter(username='demo').exists():
            User.objects.create_user(
                username='demo',
                email='demo@energytracker.com',
                password='demo1234',
            )
            self.stdout.write(self.style.SUCCESS('Demo user created: demo / demo1234'))
        else:
            self.stdout.write(self.style.WARNING('Demo user already exists.'))
