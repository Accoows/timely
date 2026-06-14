from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('establishments', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Lieu',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('adresse', models.CharField(max_length=255)),
                ('ville', models.CharField(max_length=100)),
                ('code_postal', models.CharField(blank=True, max_length=10, null=True)),
                ('region', models.CharField(blank=True, max_length=100, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Secteur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100, unique=True)),
            ],
        ),
        migrations.AddField(
            model_name='etablissement',
            name='lieu',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='etablissements', to='establishments.lieu'),
        ),
        migrations.AddField(
            model_name='etablissement',
            name='secteur',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='etablissements', to='establishments.secteur'),
        ),
    ]
