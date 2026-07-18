import { Request, Response } from 'express';
import { Schedule } from '../models';

export const getSchedules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const schedules = await Schedule.findAll({ where: { villageId } });
    res.json({ success: true, data: schedules });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId, nik } = req.params;
    const { namaLengkap, hari } = req.body;
    
    if (!hari || hari === '') {
      await Schedule.destroy({ where: { nik, villageId } });
    } else {
      const schedule = await Schedule.findOne({ where: { nik, villageId } });
      if (schedule) {
        await schedule.update({ namaLengkap, hari });
      } else {
        await Schedule.create({ nik, villageId, namaLengkap, hari });
      }
    }
    
    res.json({ success: true, message: 'Schedule updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
