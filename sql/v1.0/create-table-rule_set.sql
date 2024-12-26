-- "d2r-v1.0".rule_set definition

-- Drop table

-- DROP TABLE "d2r-v1.0".rule_set;

CREATE TABLE "d2r-v1.0".rule_set (
	id serial4 NOT NULL,
	"name" varchar(100) NULL,
	"handler" varchar(100) NULL,
	params jsonb NULL,
	visualizer varchar(100) NULL,
	descr text NULL,
	CONSTRAINT rule_set_pkey PRIMARY KEY (id)
);