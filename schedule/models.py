from django.db import models

class TaskModel(models.Model):
    topic_name=models.CharField(max_length=30)
    topic_familiarity=models.IntegerField()
    topic_difficulty=models.IntegerField()
    start_date=models.DateField() 
    end_date=models.DateField()

class NewEventModel(models.Model):
    topic_name=models.CharField(max_length=30)
    start = models.DateField(null=True,blank=True)
    end = models.DateField(null=True,blank=True)
    event_date=models.DateField()